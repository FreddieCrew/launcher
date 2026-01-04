import dgram from 'node:dgram'
import dns from 'node:dns'
import net from 'node:net'
import log from 'electron-log'
import iconv from 'iconv-lite'

interface PendingRequest {
  resolve: (data: any) => void
  timer: NodeJS.Timeout
  start: number
}

export class QueryService {
  private static instance: QueryService
  private socketV4: dgram.Socket | null = null
  private socketV6: dgram.Socket | null = null
  private pending = new Map<string, PendingRequest>()

  private constructor() {}

  public static getInstance(): QueryService {
    if (!QueryService.instance) QueryService.instance = new QueryService()
    return QueryService.instance
  }

  public start() {
    if (!this.socketV4) {
      this.socketV4 = dgram.createSocket('udp4')
      this.bindSocket(this.socketV4, 'IPv4')
    }
    if (!this.socketV6) {
      this.socketV6 = dgram.createSocket('udp6')
      this.bindSocket(this.socketV6, 'IPv6')
    }
  }

  private bindSocket(socket: dgram.Socket, label: string) {
    socket.bind(0, () => log.info(`[QueryService] ${label} Socket bound`))
    socket.on('message', (msg, rinfo) => this.handleMessage(msg, rinfo.address, rinfo.port))
    socket.on('error', (err) => log.error(`[QueryService] ${label} Socket Error:`, err))
  }

  private handleMessage(msg: Buffer, address: string, port: number) {
    if (msg.length < 11) return
    if (msg.toString('latin1', 0, 4) !== 'SAMP') return

    const opcode = String.fromCharCode(msg.readUInt8(10))
    let normalizedAddr = address
    if (net.isIPv6(address) && address.startsWith('::ffff:')) {
      normalizedAddr = address.substring(7)
    }

    const key = `${normalizedAddr}:${port}:${opcode}`

    if (this.pending.has(key)) {
      const { resolve, timer, start } = this.pending.get(key)!
      clearTimeout(timer)
      this.pending.delete(key)

      const latency = Date.now() - start
      const data = this.parsePacket(msg, opcode)

      if (data) {
        if (!Array.isArray(data) && typeof data === 'object') {
          data.ping = latency
        }
        resolve(data)
      } else {
        resolve(null)
      }
    }
  }

  public stop() {
    this.socketV4?.close()
    this.socketV6?.close()
    this.socketV4 = null
    this.socketV6 = null
  }

  public async query(host: string, port: number, opcode: string): Promise<any> {
    this.start()
    let ip = host.replace(/^\[|\]$/g, '')

    if (!net.isIP(ip)) {
      try {
        ip = await this.resolveHostname(ip)
      } catch (e: any) {
        log.warn(`[QueryService] DNS Failed for ${host}: ${e.message}`)
        return null
      }
    }

    const isV6 = net.isIPv6(ip)
    const key = `${ip}:${port}:${opcode}`

    return new Promise((resolve) => {
      if (this.pending.has(key)) return

      const packet = this.buildPacket(ip, port, opcode)
      const timer = setTimeout(() => {
        this.pending.delete(key)
        resolve(null)
      }, 3000)

      this.pending.set(key, { resolve, timer, start: Date.now() })

      try {
        const socket = isV6 ? this.socketV6 : this.socketV4
        if (socket) {
          socket.send(packet, port, ip, (err) => {
            if (err) {
              log.error(`[QueryService] Send Error (${ip}):`, err)
              clearTimeout(timer)
              this.pending.delete(key)
              resolve(null)
            }
          })
        }
      } catch (e) {
        log.error(`[QueryService] Socket Exception:`, e)
        clearTimeout(timer)
        this.pending.delete(key)
        resolve(null)
      }
    })
  }

  private resolveHostname(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, (err, address) => {
        if (err) reject(err)
        else resolve(address)
      })
    })
  }

  private buildPacket(ip: string, port: number, opcode: string): Buffer {
    const packet = Buffer.alloc(11)
    packet.write('SAMP', 0, 4, 'latin1')
    if (net.isIPv6(ip)) {
      // SA-MP protocol is fucking old. Fill IP field with 0. This is hacky.
      packet.writeUInt32LE(0, 4)
    } else {
      const parts = ip.split('.')
      for (let i = 0; i < 4; i++) packet.writeUInt8(parseInt(parts[i], 10), 4 + i)
    }
    packet.writeUInt16LE(port, 8)
    packet.write(opcode, 10, 1, 'latin1')
    return packet
  }

  private parsePacket(msg: Buffer, opcode: string): any {
    if (msg.length < 11) return null
    try {
      let offset = 11
      if (opcode === 'i') {
        const password = msg.readUInt8(offset++) === 1
        const players = msg.readUInt16LE(offset)
        offset += 2
        const maxPlayers = msg.readUInt16LE(offset)
        offset += 2
        const hnLen = msg.readUInt32LE(offset)
        offset += 4
        const hostname = this.readString(msg, offset, hnLen)
        offset += hnLen
        const gmLen = msg.readUInt32LE(offset)
        offset += 4
        const mode = this.readString(msg, offset, gmLen)
        offset += gmLen
        const langLen = msg.readUInt32LE(offset)
        offset += 4
        const language = this.readString(msg, offset, langLen)
        return { hostname, players, maxPlayers, mode, language, password }
      }
      if (opcode === 'c') {
        const count = msg.readUInt16LE(11)
        offset = 13
        const players: any[] = []
        for (let i = 0; i < count; i++) {
          const nl = msg.readUInt8(offset++)
          const name = this.readString(msg, offset, nl)
          offset += nl
          const score = msg.readUInt32LE(offset)
          offset += 4
          players.push({ name, score })
        }
        return players
      }
      if (opcode === 'r') {
        const count = msg.readUInt16LE(11)
        offset = 13
        const rules: Record<string, string> = {}
        for (let i = 0; i < count; i++) {
          const kLen = msg.readUInt8(offset++)
          const key = this.readString(msg, offset, kLen)
          offset += kLen
          const vLen = msg.readUInt8(offset++)
          const val = this.readString(msg, offset, vLen)
          offset += vLen
          rules[key.toLowerCase()] = val
        }
        return rules
      }
    } catch (e) {
      log.error('[QueryService] Parse Error', e)
      return null
    }
    return null
  }

  private readString(buf: Buffer, start: number, len: number): string {
    return iconv.decode(buf.slice(start, start + len), 'win1251')
  }
}
