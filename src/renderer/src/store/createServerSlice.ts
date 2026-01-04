import { StateCreator } from 'zustand'
import axios from 'axios'
import { AppState } from './useAppStore'
import { Server, ServerDetails } from './types'
import { generateServerKey, parseAddress } from '../../helpers/ipHelper'

export interface ServerSlice {
  serverRegistry: Record<string, Server>
  internetIds: string[]
  favoriteIds: string[]
  servers: Server[]
  playerList: any[]
  selectedServerId: string | null
  selectedServerDetails: ServerDetails | null

  getSelectedServer: () => Server | null
  fetchInternetList: () => Promise<void>
  selectServer: (s: Server | null) => void
  pingServers: (serversToPing: Server[], force?: boolean) => void
  toggleFavorite: (s: Server) => void
  addFavorite: (address: string) => Promise<void>
}

export const createServerSlice: StateCreator<AppState, [], [], ServerSlice> = (set, get) => ({
  serverRegistry: {},
  internetIds: [],
  favoriteIds: [],
  servers: [],
  playerList: [],
  selectedServerId: null,
  selectedServerDetails: null,

  getSelectedServer: () => {
    const { selectedServerId, serverRegistry } = get()
    return selectedServerId ? serverRegistry[selectedServerId] || null : null
  },

  fetchInternetList: async () => {
    set({ isLoading: true })
    try {
      const { data } = await axios.get('https://api.open.mp/servers')
      set((state) => {
        const newRegistry = { ...state.serverRegistry }
        const newInternetIds: string[] = []

        data.forEach((s: any) => {
          let ip = s.ip || ''
          let port = 7777
          if (!s.port && ip.includes(':') && !ip.includes('[')) {
            const parts = ip.split(':')
            if (parts.length === 2) {
              ip = parts[0]
              port = parseInt(parts[1], 10)
            }
          } else if (s.port) {
            port = parseInt(s.port, 10)
          }

          const key = generateServerKey(ip, port)
          const existing = newRegistry[key]

          if (existing) {
            newRegistry[key] = { ...existing, ...s }
          } else {
            newRegistry[key] = {
              ip,
              port,
              hostname: s.hn || 'Unknown',
              players: s.pc || 0,
              maxPlayers: s.pm || 0,
              mode: s.gm || '-',
              password: s.pa || false,
              ping: -1,
              isFavorite: false
            }
          }
          newInternetIds.push(key)
        })

        const nextState = {
          serverRegistry: newRegistry,
          internetIds: newInternetIds,
          isLoading: false
        }
        if (state.currentTab === 'internet') {
          return { ...nextState, servers: newInternetIds.map((id) => newRegistry[id]) }
        }
        return nextState
      })
    } catch (e) {
      set({ isLoading: false, errorMsg: 'Failed to fetch masterlist.' })
    }
  },

  selectServer: async (s) => {
    if (!s) {
      set({ selectedServerId: null, playerList: [], selectedServerDetails: null })
      return
    }
    const key = generateServerKey(s.ip, s.port)
    set({ selectedServerId: key, playerList: [], selectedServerDetails: null })

    if (window.api) {
      try {
        const [players, rules] = await Promise.all([
          window.api.server.queryPlayers(s.ip, s.port).catch(() => []),
          window.api.server.queryRules(s.ip, s.port).catch(() => ({}))
        ])

        if (get().selectedServerId === key) {
          set({
            playerList: Array.isArray(players) ? players : [],
            selectedServerDetails: rules
          })
        }
      } catch (e) {
        console.error('Query failed', e)
      }
    }
  },

  pingServers: (serversToPing, force = false) => {
    if (!window.api) return
    serversToPing.forEach((srv, index) => {
      if (!force && srv.ping !== -1) return

      setTimeout(async () => {
        try {
          const info = await window.api.server.queryInfo(srv.ip, srv.port)
          if (info) {
            const key = generateServerKey(srv.ip, srv.port)
            set((state) => {
              const currentObj = state.serverRegistry[key]
              if (!currentObj) return {}

              const updatedRegistry = { ...state.serverRegistry, [key]: { ...currentObj, ...info } }
              const ids = state.currentTab === 'internet' ? state.internetIds : state.favoriteIds
              return {
                serverRegistry: updatedRegistry,
                servers: ids.map((id) => updatedRegistry[id]).filter(Boolean)
              }
            })
          }
        } catch (e) {
          console.error(`Ping failed for ${srv.ip}`, e)
        }
      }, index * 20)
    })
  },

  toggleFavorite: (s) => {
    const key = generateServerKey(s.ip, s.port)
    set((state) => {
      const isFav = state.favoriteIds.includes(key)
      const newFavIds = isFav
        ? state.favoriteIds.filter((id) => id !== key)
        : [...state.favoriteIds, key]
      const updatedRegistry = {
        ...state.serverRegistry,
        [key]: { ...state.serverRegistry[key], isFavorite: !isFav }
      }

      const favsToSave = newFavIds.map((id) => updatedRegistry[id])
      localStorage.setItem('jmp_favs', JSON.stringify(favsToSave))

      const ids = state.currentTab === 'internet' ? state.internetIds : newFavIds
      return {
        serverRegistry: updatedRegistry,
        favoriteIds: newFavIds,
        servers: ids.map((id) => updatedRegistry[id]).filter(Boolean)
      }
    })
  },

  addFavorite: async (inputRaw: string) => {
    const parsed = parseAddress(inputRaw)
    if (!parsed.isValid) {
      set({ errorMsg: 'Invalid IP address.' })
      return
    }

    const { ip, port, formatted } = parsed
    const key = generateServerKey(ip, port)

    if (get().favoriteIds.includes(key)) {
      set({ errorMsg: 'Already in favorites.' })
      return
    }

    let info = { hostname: formatted, players: 0, maxPlayers: 0, mode: '-', password: false }
    try {
      if (window.api) info = (await window.api.server.queryInfo(ip, port)) || info
    } catch (e) {
      console.error('Initial add query failed', e)
    }

    set((state) => {
      const newRegistry = {
        ...state.serverRegistry,
        [key]: { ip, port, ...info, ping: -1, isFavorite: true }
      }
      const newFavIds = [...state.favoriteIds, key]
      localStorage.setItem('jmp_favs', JSON.stringify(newFavIds.map((id) => newRegistry[id])))
      return {
        serverRegistry: newRegistry,
        favoriteIds: newFavIds,
        servers: newFavIds.map((id) => newRegistry[id]).filter(Boolean)
      }
    })

    const newServer = get().serverRegistry[key]
    if (newServer) get().pingServers([newServer], true)
  }
})
