import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'en' | 'fr'

interface LangStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'dodai-lang' }
  )
)
