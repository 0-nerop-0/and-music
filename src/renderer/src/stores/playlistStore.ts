import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Track } from './libraryStore'

export interface Playlist {
  id: string
  name: string
  /** Массив путей к трекам (path — стабильный идентификатор трека в библиотеке) */
  trackPaths: string[]
  createdAt: number
  /** Опциональная обложка плейлиста (data URL) */
  cover?: string
}

interface PlaylistState {
  playlists: Playlist[]
  createPlaylist: (name: string) => Playlist
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track) => void
  removeTrackFromPlaylist: (playlistId: string, trackPath: string) => void
  reorderPlaylistTrack: (playlistId: string, fromIndex: number, toIndex: number) => void
  setPlaylistCover: (playlistId: string, cover: string) => void
  getPlaylistTracks: (playlistId: string, allTracks: Track[]) => Track[]
}

function genId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],

      createPlaylist: (name) => {
        const playlist: Playlist = {
          id: genId(),
          name: name.trim() || 'New Playlist',
          trackPaths: [],
          createdAt: Date.now(),
        }
        set((s) => ({ playlists: [...s.playlists, playlist] }))
        return playlist
      },

      renamePlaylist: (id, name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
        }))
      },

      deletePlaylist: (id) => {
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }))
      },

      addTrackToPlaylist: (playlistId, track) => {
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p
            if (p.trackPaths.includes(track.path)) return p
            return { ...p, trackPaths: [...p.trackPaths, track.path] }
          }),
        }))
      },

      removeTrackFromPlaylist: (playlistId, trackPath) => {
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, trackPaths: p.trackPaths.filter((tp) => tp !== trackPath) }
              : p
          ),
        }))
      },

      reorderPlaylistTrack: (playlistId, fromIndex, toIndex) => {
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p
            const paths = [...p.trackPaths]
            if (
              fromIndex < 0 || fromIndex >= paths.length ||
              toIndex < 0 || toIndex >= paths.length
            ) return p
            const [moved] = paths.splice(fromIndex, 1)
            paths.splice(toIndex, 0, moved)
            return { ...p, trackPaths: paths }
          }),
        }))
      },

      setPlaylistCover: (playlistId, cover) => {
        set((s) => ({
          playlists: s.playlists.map((p) => (p.id === playlistId ? { ...p, cover } : p)),
        }))
      },

      getPlaylistTracks: (playlistId, allTracks) => {
        const playlist = get().playlists.find((p) => p.id === playlistId)
        if (!playlist) return []
        const byPath = new Map(allTracks.map((t) => [t.path, t]))
        return playlist.trackPaths
          .map((p) => byPath.get(p))
          .filter((t): t is Track => Boolean(t))
      },
    }),
    { name: 'mei-music-playlists' }
  )
)
