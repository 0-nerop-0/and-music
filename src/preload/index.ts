import { contextBridge, ipcRenderer } from 'electron'

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

export interface ScanResult {
  cancelled: boolean
  tracks: Track[]
  folder?: string
}

export interface DiscordPresenceInfo {
  title: string
  artist: string
  isPlaying: boolean
  /** позиция в секундах */
  seek: number
  /** длительность в секундах */
  duration: number
}

export interface DiscordResult {
  ok: boolean
  error?: string
}

const api = {
  // Window controls
  windowMinimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  windowMaximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  windowClose: (): Promise<void> => ipcRenderer.invoke('window:close'),
  windowIsMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),

  // Library
  scanFolder: (): Promise<ScanResult> => ipcRenderer.invoke('scan-folder'),
  watchFolders: (folders: string[]): Promise<void> => ipcRenderer.invoke('library:watch-folders', folders),
  unwatchFolder: (folder: string): Promise<void> => ipcRenderer.invoke('library:unwatch-folder', folder),
  onFolderUpdated: (callback: (result: { folder: string; tracks: Track[] }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: { folder: string; tracks: Track[] }) => callback(result)
    ipcRenderer.on('library:folder-updated', listener)
    return () => ipcRenderer.removeListener('library:folder-updated', listener)
  },
  getMetadata: (filePath: string): Promise<Track | null> => ipcRenderer.invoke('get-metadata', filePath),

  // Audio
  readAudioFile: (filePath: string): Promise<{ ok: boolean; dataUrl?: string; error?: string }> =>
    ipcRenderer.invoke('read-audio-file', filePath),

  // Wallpaper / images
  pickWallpaper: (): Promise<{ cancelled: boolean; fileUrl?: string; fileName?: string; animated?: boolean; error?: string }> =>
    ipcRenderer.invoke('pick-wallpaper'),
  resolveWallpaperUrl: (url: string): Promise<string | null> => ipcRenderer.invoke('resolve-wallpaper-url', url),

  // Discord Rich Presence
  discordEnable: (clientId?: string): Promise<DiscordResult> =>
    ipcRenderer.invoke('discord:enable', clientId),
  discordDisable: (): Promise<DiscordResult> => ipcRenderer.invoke('discord:disable'),
  discordUpdatePresence: (info: DiscordPresenceInfo | null): Promise<DiscordResult> =>
    ipcRenderer.invoke('discord:updatePresence', info),
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
