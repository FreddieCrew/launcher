import { StateCreator } from 'zustand'
import { AppState } from './useAppStore'
import { AppConfig, DEFAULT_CONFIG, Server } from './types'
import { generateServerKey } from '../../helpers/ipHelper'

export interface ConfigSlice {
  config: AppConfig
  savedNicknames: Record<string, string>
  init: () => Promise<void>
  updateConfig: (k: keyof AppConfig, v: string) => void
  saveConfig: () => Promise<void>
  launch: (password?: string, tempNick?: string, versionOverride?: string) => Promise<void>
}

const safeParse = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set, get) => ({
  config: DEFAULT_CONFIG,
  savedNicknames: safeParse('jmp_server_nicks', {}),

  init: async () => {
    if (!window.api) return
    try {
      const c = await window.api.config.read()
      const nicks = safeParse('jmp_server_nicks', {})
      const favsRaw: Server[] = safeParse('jmp_favs', [])
      const registry: Record<string, Server> = {}
      const favIds: string[] = []

      favsRaw.forEach((s) => {
        const key = generateServerKey(s.ip, s.port)
        registry[key] = { ...s, isFavorite: true, ping: -1 }
        favIds.push(key)
      })
      set((state) => ({
        config: { ...state.config, ...c },
        savedNicknames: nicks,
        serverRegistry: registry,
        favoriteIds: favIds,
        currentTab: 'favorites',
        servers: favIds.map((id) => registry[id]).filter(Boolean)
      }))
    } catch (e) {
      console.error('Init failed', e)
    }
  },

  updateConfig: (k, v) => set((state) => ({ config: { ...state.config, [k]: v } })),

  saveConfig: async () => {
    if (window.api) await window.api.config.write(get().config)
  },

  launch: async (password, tempNick, versionOverride) => {
    const s = get().getSelectedServer()
    if (!s || !window.api) return

    const { config, savedNicknames } = get()
    if (!config.gtaPath) {
      set({ errorMsg: 'GTA Path not set. Go to settings.' })
      return
    }

    const key = generateServerKey(s.ip, s.port)
    const finalNick = tempNick || savedNicknames[key] || config.nickname

    const newNicks = { ...savedNicknames, [key]: finalNick }
    localStorage.setItem('jmp_server_nicks', JSON.stringify(newNicks))
    set({ savedNicknames: newNicks })

    const finalVersion = versionOverride || config.preferredVersion

    const res = await window.api.server.launch({
      ...config,
      username: finalNick,
      ip: s.ip,
      port: s.port,
      password: password || '',
      preferredVersion: finalVersion
    })

    if (!res.success) set({ errorMsg: res.msg || 'Launch failed.' })
  }
})
