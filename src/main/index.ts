import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join, extname, basename, relative, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { watch, type FSWatcher, copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { collectAudioFiles, stableTrackId } from './libraryScanner'
import { serveMedia } from './mediaProtocol'
import {
  enableDiscordPresence,
  disableDiscordPresence,
  updatePresence,
  type PresenceInfo,
} from './discordRpc'

let mainWindow: BrowserWindow | null = null

protocol.registerSchemesAsPrivileged([{
  scheme: 'andmusic',
  privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true },
}])

const audioTokens = new Map<string, string>()
const audioPaths = new Set<string>()
const approvedFolders = new Set<string>()
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma', '.opus'])
const WALLPAPER_NAME = /^custom-[0-9a-f-]+\.(?:jpg|jpeg|png|webp|gif|avif)$/i

function approvedFoldersFile() { return join(app.getPath('userData'), 'music-folders.json') }
function saveApprovedFolders() {
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(approvedFoldersFile(), JSON.stringify([...approvedFolders]))
}
function loadApprovedFolders() {
  try {
    const saved = JSON.parse(readFileSync(approvedFoldersFile(), 'utf8'))
    if (Array.isArray(saved)) {
      for (const folder of saved) if (typeof folder === 'string') approvedFolders.add(folder)
    }
  } catch { /* first run */ }
}
function wallpaperUrl(name: string) { return `andmusic://wallpaper/${encodeURIComponent(name)}` }
function isWithin(root: string, filePath: string) {
  const rel = relative(root, filePath)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

interface WatchedFolder {
  watchers: Map<string, FSWatcher>
  timer?: NodeJS.Timeout
  revision: number
}

const watchedFolders = new Map<string, WatchedFolder>()

function unwatchFolder(folder: string) {
  const state = watchedFolders.get(folder)
  if (!state) return
  if (state.timer) clearTimeout(state.timer)
  for (const watcher of state.watchers.values()) watcher.close()
  watchedFolders.delete(folder)
  for (const path of audioPaths) {
    if (isWithin(folder, path) && ![...approvedFolders].some((other) => other !== folder && isWithin(other, path))) audioPaths.delete(path)
  }
}

function scheduleFolderRefresh(folder: string) {
  const state = watchedFolders.get(folder)
  if (!state) return
  if (state.timer) clearTimeout(state.timer)
  state.timer = setTimeout(() => { void refreshFolder(folder, true) }, 500)
}

async function refreshFolder(folder: string, notify: boolean) {
  let state = watchedFolders.get(folder)
  if (!state) {
    state = { watchers: new Map(), revision: 0 }
    watchedFolders.set(folder, state)
  }
  const revision = ++state.revision
  const { files, directories } = await collectAudioFiles(folder)
  if (watchedFolders.get(folder) !== state || state.revision !== revision) return []

  const fileSet = new Set(files)
  for (const path of audioPaths) if (isWithin(folder, path) && !fileSet.has(path)) audioPaths.delete(path)
  for (const file of files) audioPaths.add(file)

  const active = new Set(directories)
  for (const [directory, watcher] of state.watchers) {
    if (!active.has(directory)) {
      watcher.close()
      state.watchers.delete(directory)
    }
  }
  for (const directory of directories) {
    if (state.watchers.has(directory)) continue
    try {
      const watcher = watch(directory, () => scheduleFolderRefresh(folder))
      watcher.on('error', () => scheduleFolderRefresh(folder))
      state.watchers.set(directory, watcher)
    } catch { /* inaccessible directory */ }
  }

  const tracks: Awaited<ReturnType<typeof parseTrack>>[] = []
  for (let i = 0; i < files.length; i += 20) {
    tracks.push(...await Promise.all(files.slice(i, i + 20).map((file) => parseTrack(file, false))))
    if (watchedFolders.get(folder) !== state || state.revision !== revision) return []
  }
  if (notify) mainWindow?.webContents.send('library:folder-updated', { folder, tracks })
  return tracks
}

async function parseTrack(filePath: string, includeCover = true) {
  const name = filePath.split(/[\\/]/).pop() ?? filePath
  const base = name.slice(0, name.lastIndexOf('.'))
  const dashIdx = base.indexOf(' - ')
  const fallbackArtist = dashIdx > 0 ? base.slice(0, dashIdx) : 'Unknown Artist'
  const fallbackTitle = dashIdx > 0 ? base.slice(dashIdx + 3) : base

  try {
    const mm = await import('music-metadata')
    // TypeScript resolves the package's browser types under bundler resolution,
    // while Electron's main process uses its Node export with parseFile.
    const parseFile = (mm as unknown as {
      parseFile: (path: string, options: { duration: boolean; skipCovers: boolean }) => Promise<Awaited<ReturnType<typeof mm.parseBuffer>>>
    }).parseFile
    const meta = await parseFile(filePath, { duration: true, skipCovers: !includeCover })
    const tag = meta.common

    let coverData: string | undefined
    const pic = tag.picture?.[0]
    if (pic) {
      const b64 = Buffer.from(pic.data).toString('base64')
      coverData = `data:${pic.format};base64,${b64}`
    }

    return {
      id: stableTrackId(filePath),
      path: filePath,
      title: tag.title || fallbackTitle,
      artist: tag.artist || tag.albumartist || fallbackArtist,
      album: tag.album || 'Unknown Album',
      duration: meta.format.duration ?? 0,
      coverData,
      volume: 1,
    }
  } catch {
    return {
      id: stableTrackId(filePath),
      path: filePath,
      title: fallbackTitle,
      artist: fallbackArtist,
      album: 'Unknown Album',
      duration: 0,
      volume: 1,
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    backgroundColor: '#1c1b1f',
    icon: app.isPackaged
      ? join(process.resourcesPath, process.platform === 'win32' ? 'icon.ico' : 'icon.png')
      : join(__dirname, '../../resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Some Linux systems do not allow Chromium user namespaces; keep the
      // packaged Windows/macOS renderer sandboxed.
      sandbox: process.platform !== 'linux',
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Window controls ──────────────────────────────────────────────────────────
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// ── Аудио: только файлы из выбранных музыкальных папок ──────────────────────
ipcMain.handle('read-audio-file', (_e, filePath: string) => {
  try {
    if (typeof filePath !== 'string' || !AUDIO_EXTENSIONS.has(extname(filePath).toLowerCase()) || !audioPaths.has(filePath)) {
      return { ok: false, error: 'File is outside the music library' }
    }
    const token = randomUUID()
    audioTokens.set(token, filePath)
    if (audioTokens.size > 512) audioTokens.delete(audioTokens.keys().next().value!)
    return { ok: true, dataUrl: `andmusic://audio/${token}` }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// ── Выбор файла обоев ────────────────────────────────────────────────────────
ipcMain.handle('pick-wallpaper', async () => {
  if (!mainWindow) return { cancelled: true }
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select wallpaper image',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }],
    properties: ['openFile'],
  })
  if (res.canceled || !res.filePaths.length) return { cancelled: true }

  const sourcePath = res.filePaths[0]
  const extension = extname(sourcePath).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(extension)) {
    return { cancelled: false, error: 'unsupported-format' }
  }

  try {
    const wallpaperDir = join(app.getPath('userData'), 'wallpapers')
    mkdirSync(wallpaperDir, { recursive: true })
    const targetName = `custom-${randomUUID()}${extension}`
    const targetPath = join(wallpaperDir, targetName)
    copyFileSync(sourcePath, targetPath)

    return {
      cancelled: false,
      fileUrl: wallpaperUrl(targetName),
      fileName: basename(sourcePath),
      animated: extension === '.gif',
    }
  } catch (err) {
    console.error('Failed to save wallpaper:', err)
    return { cancelled: false, error: 'save-failed' }
  }
})

ipcMain.handle('resolve-wallpaper-url', (_e, url: string) => {
  try {
    if (typeof url !== 'string' || !url.startsWith('file:')) return null
    const oldPath = fileURLToPath(url)
    const root = join(app.getPath('userData'), 'wallpapers')
    const name = basename(oldPath)
    if (!WALLPAPER_NAME.test(name) || !isWithin(root, oldPath)) return null
    return wallpaperUrl(name)
  } catch { return null }
})

// ── Scan folder ──────────────────────────────────────────────────────────────
ipcMain.handle('scan-folder', async () => {
  if (!mainWindow) return { cancelled: true, tracks: [] }

  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select music folder',
  })
  if (res.canceled || !res.filePaths.length) return { cancelled: true, tracks: [] }

  const folder = res.filePaths[0]
  approvedFolders.add(folder)
  saveApprovedFolders()
  const tracks = await refreshFolder(folder, false)
  return { cancelled: false, tracks, folder }
})

ipcMain.handle('library:watch-folders', async (_e, folders: string[]) => {
  if (!Array.isArray(folders)) return
  // One-time migration from the earlier renderer-only folder setting.
  if (!existsSync(approvedFoldersFile())) {
    for (const folder of folders) if (typeof folder === 'string' && isAbsolute(folder)) approvedFolders.add(folder)
    saveApprovedFolders()
  }
  await Promise.all(folders.filter((folder): folder is string => typeof folder === 'string' && approvedFolders.has(folder)).map((folder) => refreshFolder(folder, true)))
})

ipcMain.handle('library:unwatch-folder', (_e, folder: string) => {
  if (typeof folder === 'string') {
    unwatchFolder(folder)
    approvedFolders.delete(folder)
    saveApprovedFolders()
  }
})

ipcMain.handle('get-metadata', (_e, filePath: string) =>
  typeof filePath === 'string' && audioPaths.has(filePath) ? parseTrack(filePath) : null
)

// ── Discord Rich Presence ─────────────────────────────────────────────────────
ipcMain.handle('discord:enable', async (_e, clientId?: string) => {
  try {
    await enableDiscordPresence(clientId)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('discord:disable', async () => {
  try {
    await disableDiscordPresence()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('discord:updatePresence', async (_e, info: PresenceInfo | null) => {
  try {
    await updatePresence(info)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  loadApprovedFolders()
  protocol.handle('andmusic', (request) => {
    try {
      const url = new URL(request.url)
      const name = decodeURIComponent(url.pathname.slice(1))
      if (url.hostname === 'audio') {
        const filePath = audioTokens.get(name)
        return filePath ? serveMedia(request, filePath) : new Response(null, { status: 404 })
      }
      if (url.hostname === 'wallpaper' && WALLPAPER_NAME.test(name)) {
        return serveMedia(request, join(app.getPath('userData'), 'wallpapers', name))
      }
    } catch { /* malformed URL */ }
    return new Response(null, { status: 404 })
  })
  electronApp.setAppUserModelId('com.andmusic.desktop')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
