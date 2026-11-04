import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Track {
  id: number
  path: string
  title: string
  artist: string
  album: string
  duration: number
  coverData?: string
  volume: number
}

interface LibraryState {
  tracks: Track[]
  folders: string[]
  folderPaths: Record<string, string[]>
  loading: boolean
  updateFolder: (folder: string, tracks: Track[]) => void
  removeFolder: (folder: string) => void
  setLoading: (v: boolean) => void
  clear: () => void
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      tracks: [],
      folders: [],
      folderPaths: {},
      loading: false,

      updateFolder: (folder, incoming) => set((state) => {
        if (!folder) return state
        const folderPaths = { ...state.folderPaths, [folder]: [...new Set(incoming.map((track) => track.path))] }
        const activePaths = new Set(Object.values(folderPaths).flat())
        const merged = new Map(state.tracks.filter((track) => activePaths.has(track.path)).map((track) => [track.path, track]))
        for (const track of incoming) merged.set(track.path, track)
        return {
          folders: state.folders.includes(folder) ? state.folders : [...state.folders, folder],
          folderPaths,
          tracks: [...merged.values()],
        }
      }),
      removeFolder: (folder) => set((state) => {
        const folderPaths = { ...state.folderPaths }
        delete folderPaths[folder]
        const activePaths = new Set(Object.values(folderPaths).flat())
        return {
          folders: state.folders.filter((item) => item !== folder),
          folderPaths,
          tracks: state.tracks.filter((track) => activePaths.has(track.path)),
        }
      }),
      setLoading: (loading) => set({ loading }),
      clear: () => set({ tracks: [], folders: [], folderPaths: {} }),
    }),
    {
      name: 'mei-music-library',
      version: 1,
      migrate: (persistedState) => {
        const old = persistedState as { folder?: string | null; tracks?: Track[] }
        const folder = old.folder
        return {
          ...old,
          tracks: (old.tracks ?? []).map(({ coverData: _coverData, ...track }) => track),
          folders: folder ? [folder] : [],
          folderPaths: folder ? { [folder]: (old.tracks ?? []).map((track) => track.path) } : {},
        }
      },
      // Don't persist coverData — it's large; re-fetch on load
      partialize: (s) => ({
        folders: s.folders,
        folderPaths: s.folderPaths,
        tracks: s.tracks.map(({ coverData: _cd, ...rest }) => rest),
      }),
    }
  )
)
