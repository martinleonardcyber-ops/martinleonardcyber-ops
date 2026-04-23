import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesStore {
  favorites: Set<string>
  toggle:    (key: string) => void
  isFav:     (key: string) => boolean
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: new Set<string>(),

      toggle(key) {
        set((s) => {
          const next = new Set(s.favorites)
          next.has(key) ? next.delete(key) : next.add(key)
          return { favorites: next }
        })
      },

      isFav(key) {
        return get().favorites.has(key)
      },
    }),
    {
      name: 'modly-favorites',
      storage: {
        getItem:    (k) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null },
        setItem:    (k, v) => localStorage.setItem(k, JSON.stringify(v)),
        removeItem: (k) => localStorage.removeItem(k),
      },
      // Sets are not JSON-serialisable by default — convert to/from array
      partialize: (s) => ({ favorites: Array.from(s.favorites) } as any),
      merge:      (persisted: any, current) => ({
        ...current,
        favorites: new Set<string>(persisted?.favorites ?? []),
      }),
    }
  )
)
