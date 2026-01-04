// RFC 791 - https://datatracker.ietf.org/doc/html/rfc791
const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

// RFC 1035/1123 - https://datatracker.ietf.org/doc/html/rfc1035 / https://www.rfc-editor.org/rfc/rfc1123
const DOMAIN_PATTERN =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$/i

// RFC 4291 - https://datatracker.ietf.org/doc/html/rfc4291
const IPV6_PATTERN =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/i

export interface ParsedAddress {
  ip: string
  port: number
  type: 'ipv4' | 'ipv6' | 'domain' | 'invalid'
  isValid: boolean
  formatted: string
}

export const parseAddress = (input: string): ParsedAddress => {
  const cleanInput = input.trim()
  let ip = ''
  let port = 7777
  let type: ParsedAddress['type'] = 'invalid'

  const bracketMatch = cleanInput.match(/^\[([0-9a-fA-F:.]+)\](?::(\d+))?$/)

  if (bracketMatch) {
    ip = bracketMatch[1]
    if (bracketMatch[2]) port = parseInt(bracketMatch[2], 10)
    if (IPV6_PATTERN.test(ip)) type = 'ipv6'
  } else {
    const lastColonIndex = cleanInput.lastIndexOf(':')

    // heuristic check to see if the part after the last colon actually looks like a port
    if (lastColonIndex > -1) {
      const hostPart = cleanInput.substring(0, lastColonIndex)
      const portPart = cleanInput.substring(lastColonIndex + 1)

      if (/^\d+$/.test(portPart) && portPart.length <= 5) {
        const p = parseInt(portPart, 10)

        if (IPV6_PATTERN.test(hostPart)) {
          ip = hostPart
          port = p
          type = 'ipv6'
        } else if (IPV4_PATTERN.test(hostPart) || DOMAIN_PATTERN.test(hostPart)) {
          ip = hostPart
          port = p
        } else if (IPV6_PATTERN.test(cleanInput)) {
          ip = cleanInput
          type = 'ipv6'
        } else {
          ip = cleanInput
        }
      } else {
        ip = cleanInput
      }
    } else {
      ip = cleanInput
    }

    if (type === 'invalid') {
      if (IPV4_PATTERN.test(ip)) type = 'ipv4'
      else if (IPV6_PATTERN.test(ip)) type = 'ipv6'
      else if (DOMAIN_PATTERN.test(ip)) type = 'domain'
    }
  }

  if (port < 1 || port > 65535) type = 'invalid'

  return {
    ip,
    port,
    type,
    isValid: type !== 'invalid',
    formatted: formatAddress(ip, port, type)
  }
}

export const formatAddress = (ip: string, port: number, type?: string) => {
  const isV6 = type === 'ipv6' || (ip.includes(':') && !ip.includes('.'))

  if (isV6) {
    const clean = ip.replace(/^\[|\]$/g, '')
    return `[${clean}]:${port}`
  }
  return `${ip}:${port}`
}

export const generateServerKey = (ip: string, port: number) => {
  const cleanIp = ip.replace(/^\[|\]$/g, '')
  const isV6 = cleanIp.includes(':') && !cleanIp.includes('.')

  if (isV6) return `[${cleanIp}]:${port}`
  return `${cleanIp}:${port}`
}
