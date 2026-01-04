import { StateCreator } from 'zustand'
import { AppState } from './useAppStore'

export interface UISlice {
  searchQuery: string
  currentTab: 'internet' | 'favorites'
  isLoading: boolean
  errorMsg: string | null
  isJoinModalOpen: boolean
  isAddModalOpen: boolean

  setTab: (t: 'internet' | 'favorites') => void
  setSearchQuery: (q: string) => void
  openJoinModal: () => void
  closeJoinModal: () => void
  openAddModal: () => void
  closeAddModal: () => void
  clearError: () => void
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  searchQuery: '',
  currentTab: 'favorites',
  isLoading: false,
  errorMsg: null,
  isJoinModalOpen: false,
  isAddModalOpen: false,

  setTab: (tab) => {
    set((state) => {
      const ids = tab === 'internet' ? state.internetIds : state.favoriteIds
      const viewList = ids.map((id) => state.serverRegistry[id]).filter(Boolean)
      return {
        currentTab: tab,
        searchQuery: '',
        selectedServerId: null,
        playerList: [],
        selectedServerDetails: null,
        servers: viewList
      }
    })
    if (tab === 'internet' && get().internetIds.length === 0) {
      get().fetchInternetList()
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  openJoinModal: () => set({ isJoinModalOpen: true }),
  closeJoinModal: () => set({ isJoinModalOpen: false }),
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  clearError: () => set({ errorMsg: null })
})
