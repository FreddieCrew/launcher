import dgram from 'node:dgram';
import dns from 'node:dns';
import log from 'electron-log';

interface PendingRequest {
  resolve: (data: any) => void;
  timer: NodeJS.Timeout;
  start: number;
}

export class QueryService {
  private static instance: QueryService;
  private socket: dgram.Socket | null = null;
  private pending = new Map<string, PendingRequest>();

  private constructor() { }

  public static getInstance(): QueryService {
    if (!QueryService.instance) QueryService.instance = new QueryService();
    return QueryService.instance;
  }

  public start() {
    if (this.socket) return;

    this.socket = dgram.createSocket('udp4');

    this.socket.bind(0, () => {
      log.info('[QueryService] UDP Socket bound');
    });

    this.socket.on('message', (msg, rinfo) => {
      if (msg.length < 11) return;
      if (msg.toString('latin1', 0, 4) !== 'SAMP') return;
      const opcode = String.fromCharCode(msg.readUInt8(10));
      const key = `${rinfo.address}:${rinfo.port}:${opcode}`;

      if (this.pending.has(key)) {
        const { resolve, timer, start } = this.pending.get(key)!;
        clearTimeout(timer);
        this.pending.delete(key);

        const latency = Date.now() - start;
        const data = this.parsePacket(msg, opcode);

        if (data) {
          if (!Array.isArray(data) && typeof data === 'object') {
            data.ping = latency;
          }
          resolve(data);
        } else {
          resolve(null);
        }
      }
    });

    this.socket.on('error', (err) => log.error('[QueryService] Socket Error:', err));
  }

  public stop() {
    this.socket?.close();
    this.socket = null;
  }

  public async query(host: string, port: number, opcode: string): Promise<any> {
    if (!this.socket) this.start();

    let ip = host;
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      try {
        ip = await this.resolveHostname(host);
      } catch (e) {
        log.warn(`[QueryService] DNS Failed for ${host}`);
        return null;
      }
    }

    const key = `${ip}:${port}:${opcode}`;

    return new Promise((resolve) => {
      if (this.pending.has(key)) {
        return;
      }

      const packet = this.buildPacket(ip, port, opcode);

      const timer = setTimeout(() => {
        this.pending.delete(key);
        resolve(null);
      }, 3000);

      this.pending.set(key, { resolve, timer, start: Date.now() });

      try {
        if (this.socket) {
          this.socket.send(packet, port, ip, (err) => {
            if (err) {
              log.error('[QueryService] Send Error:', err);
              clearTimeout(timer);
              this.pending.delete(key);
              resolve(null);
            }
          });
        }
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(key);
        resolve(null);
      }
    });
  }

  private resolveHostname(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, 4, (err, address) => {
        if (err) reject(err);
        else resolve(address);
      });
    });
  }

  private buildPacket(ip: string, port: number, opcode: string): Buffer {
    const packet = Buffer.alloc(11);

    packet.write('SAMP', 0, 4, 'latin1');

    const parts = ip.split('.');
    for (let i = 0; i < 4; i++) {
      packet.writeUInt8(parseInt(parts[i], 10), 4 + i);
    }

    packet.writeUInt16LE(port, 8);
    packet.write(opcode, 10, 1, 'latin1');
    return packet;
  }

  private parsePacket(msg: Buffer, opcode: string): any {
    if (msg.length < 11) return null;

    try {
      let offset = 11;

      if (opcode === 'i') {
        if (offset + 1 > msg.length) return null;
        const password = msg.readUInt8(offset++) === 1;

        if (offset + 4 > msg.length) return null;
        const players = msg.readUInt16LE(offset); offset += 2;
        const maxPlayers = msg.readUInt16LE(offset); offset += 2;

        if (offset + 4 > msg.length) return null;
        const hnLen = msg.readUInt32LE(offset); offset += 4;
        if (offset + hnLen > msg.length) return null;
        const hostname = this.readString(msg, offset, hnLen); offset += hnLen;

        if (offset + 4 > msg.length) return null;
        const gmLen = msg.readUInt32LE(offset); offset += 4;
        if (offset + gmLen > msg.length) return null;
        const mode = this.readString(msg, offset, gmLen); offset += gmLen;

        if (offset + 4 > msg.length) return null;
        const langLen = msg.readUInt32LE(offset); offset += 4;
        if (offset + langLen > msg.length) return null;
        const language = this.readString(msg, offset, langLen);

        return { hostname, players, maxPlayers, mode, language, password };
      }

      else if (opcode === 'c') {
        if (offset + 2 > msg.length) return [];
        const count = msg.readUInt16LE(11);
        offset = 13;
        const players = [];

        for (let i = 0; i < count; i++) {
          if (offset + 1 > msg.length) break;
          const nl = msg.readUInt8(offset++);

          if (offset + nl > msg.length) break;
          const name = this.readString(msg, offset, nl); offset += nl;

          if (offset + 4 > msg.length) break;
          const score = msg.readUInt32LE(offset); offset += 4;

          players.push({ name, score });
        }
        return players;
      }

      else if (opcode === 'r') {
        if (offset + 2 > msg.length) return {};
        const count = msg.readUInt16LE(11);
        offset = 13;
        const rules: { [key: string]: string } = {};

        for (let i = 0; i < count; i++) {
          if (offset + 1 > msg.length) break;
          const keyLen = msg.readUInt8(offset++);

          if (offset + keyLen > msg.length) break;
          const key = this.readString(msg, offset, keyLen).toLowerCase();
          offset += keyLen;

          if (offset + 1 > msg.length) break;
          const valLen = msg.readUInt8(offset++);

          if (offset + valLen > msg.length) break;
          const val = this.readString(msg, offset, valLen);
          offset += valLen;

          rules[key] = val;
        }
        return rules;
      }
    } catch (e) {
      log.error('[QueryService] Parse Error', e);
      return null;
    }
    return null;
  }

  private readString(buf: Buffer, start: number, len: number): string {
    return buf.toString('latin1', start, start + len);
  }
}