import { create } from 'zustand'

export type Page = 'dashboard' | 'generate' | 'workflows' | 'models' | 'settings'

interface NavState {
  currentPage: Page
  navigate: (page: Page) => void
}

export const useNavStore = create<NavState>((set) => ({
  currentPage: 'dashboard',
  navigate: (page) => set({ currentPage: page })
}))
