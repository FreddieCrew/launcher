export const ASSET_URL = 'https://assets.open.mp/samp_clients.7z'

export interface VersionInfo {
  id: string
  name: string
  archivePath: string
  checksum: string
}

export const SAMP_VERSIONS: VersionInfo[] = [
  {
    id: '0.3.7-R5',
    name: 'SA-MP 0.3.7 R5 (Recommended)',
    archivePath: '0.3.7-R5/',
    checksum: '5ba5f0be7af99dfd03fb39e88a970a2b'
  },
  {
    id: '0.3.7-R4',
    name: 'SA-MP 0.3.7 R4',
    archivePath: '0.3.7-R4/',
    checksum: '7b3a5b379848eda9f9e26f633515a77d'
  },
  {
    id: '0.3.7-R3',
    name: 'SA-MP 0.3.7 R3',
    archivePath: '0.3.7-R3/',
    checksum: '61dfd96e0bb01e2fd8cd27e0df18e653'
  },
  {
    id: '0.3.7-R2',
    name: 'SA-MP 0.3.7 R2',
    archivePath: '0.3.7-R2/',
    checksum: '074241172174f9f2f93afce3261f97ad'
  },
  {
    id: '0.3.7-R1',
    name: 'SA-MP 0.3.7 R1 (Legacy)',
    archivePath: '0.3.7-R1/',
    checksum: '1d22eaa2605717ddf215f68e861de378'
  },
  {
    id: '0.3.DL',
    name: 'SA-MP 0.3.DL (Custom Models)',
    archivePath: '0.3.DL/',
    checksum: '449e4f985215ffb5bffadf23551c0d50'
  }
]
