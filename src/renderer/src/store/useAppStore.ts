import { create } from 'zustand'
import { createConfigSlice, ConfigSlice } from './createConfigSlice'
import { createServerSlice, ServerSlice } from './createServerSlice'
import { createUISlice, UISlice } from './createUISlice'

export type AppState = ConfigSlice & ServerSlice & UISlice

export const useAppStore = create<AppState>()((...a) => ({
  ...createConfigSlice(...a),
  ...createServerSlice(...a),
  ...createUISlice(...a)
}))

export type { Server, AppConfig } from './types'
