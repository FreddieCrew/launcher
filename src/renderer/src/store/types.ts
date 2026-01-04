import { SAMP_VERSIONS } from '../../../shared/versions'

export interface Server {
  ip: string
  port: number
  hostname: string
  players: number
  maxPlayers: number
  mode: string
  password: boolean
  ping: number
  isFavorite: boolean
}

export interface ServerDetails {
  version?: string
  mapname?: string
  lagcomp?: string
  [key: string]: string | undefined
}

export interface AppConfig {
  nickname: string
  gtaPath: string
  winePrefix: string
  wineBinary: string
  launcherPath: string
  preferredVersion: string
}

export const DEFAULT_CONFIG: AppConfig = {
  nickname: 'Player',
  gtaPath: '',
  winePrefix: '',
  wineBinary: 'wine',
  launcherPath: '',
  preferredVersion: SAMP_VERSIONS[0].id
}

declare global {
  interface Window {
    api: any
    electronAPI: any
  }
}
