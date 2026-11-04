import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, FolderOpen, Music2, Play, Pause, Plus, Check, X } from 'lucide-react'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { usePlaylistStore } from '../stores/playlistStore'
import type { Track } from '../stores/libraryStore'
import { useTranslation } from '../lib/i18n'

function formatTime(s: number) {
  if (!s || s < 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function AddToPlaylistMenu({
  track,
  anchorRect,
  onClose,
}: {
  track: Track
  anchorRect: { top: number; right: number }
  onClose: () => void
}) {
  const t = useTranslation()
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylistStore()
  const enqueueTrack = usePlayerStore((state) => state.enqueueTrack)
  const [newName, setNewName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    // capture-фаза + небольшая задержка регистрации — иначе тот же клик,
    // что открыл меню (event bubbling), сразу же его закрывает
    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
    })
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [onClose])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleCreateAndAdd = () => {
    const name = newName.trim()
    if (!name) return
    const pl = createPlaylist(name)
    addTrackToPlaylist(pl.id, track)
    setNewName('')
    onClose()
  }

  // Рендерим через портал в document.body — иначе меню обрезается overflow
  // виртуализированного скролл-контейнера списка треков и клики не долетают.
  return createPortal(
    <div
      ref={menuRef}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-56 rounded-xl p-2 shadow-2xl"
      role="dialog"
      aria-label={t('Добавить трек в плейлист', 'Add track to playlist')}
      style={{
        top: Math.max(8, Math.min(anchorRect.top, window.innerHeight - 350)),
        right: Math.max(8, Math.min(anchorRect.right, window.innerWidth - 232)),
        maxHeight: 'calc(100vh - 16px)',
        background: 'rgba(30,28,38,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        '--app-text': '#fff',
        '--app-accent': '#d0bcff',
        '--text-40': 'rgba(255,255,255,0.4)',
      } as React.CSSProperties}
    >
      <p className="text-xs font-semibold uppercase tracking-widest px-2 py-1" style={{ color: 'var(--text-40)' }}>
        {t('Действия с треком', 'Track actions')}
      </p>
      <button className="w-full px-2 py-1.5 text-sm text-left rounded-lg hover:bg-white/10" onClick={() => { enqueueTrack(track, 'next'); onClose() }}>
        {t('Играть следующим', 'Play next')}
      </button>
      <button className="w-full px-2 py-1.5 text-sm text-left rounded-lg hover:bg-white/10" onClick={() => { enqueueTrack(track, 'end'); onClose() }}>
        {t('Добавить в конец очереди', 'Add to queue end')}
      </button>
      <p className="text-xs font-semibold uppercase tracking-widest px-2 pt-2 pb-1" style={{ color: 'var(--text-40)' }}>
        {t('Плейлисты', 'Playlists')}
      </p>
      <div className="max-h-40 overflow-y-auto">
        {playlists.length === 0 && (
          <p className="text-xs px-2 py-2" style={{ color: 'var(--text-40)' }}>{t('Нет плейлистов', 'No playlists')}</p>
        )}
        {playlists.map((pl) => {
          const has = pl.trackPaths.includes(track.path)
          return (
            <button
              key={pl.id}
              onClick={() => { addTrackToPlaylist(pl.id, track); onClose() }}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
              style={{ color: 'var(--app-text)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '')}
            >
              <span className="truncate">{pl.name}</span>
              {has && <Check size={13} style={{ color: 'var(--app-accent)' }} className="shrink-0" />}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd() }}
          placeholder={t('Новый плейлист…', 'New playlist…')}
          aria-label={t('Название нового плейлиста', 'New playlist name')}
          className="flex-1 px-2 py-1.5 text-xs rounded-lg min-w-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--app-text)' }}
        />
        <button
          onClick={handleCreateAndAdd}
          aria-label={t('Создать плейлист и добавить трек', 'Create playlist and add track')}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 player-btn"
          style={{ background: 'rgba(208,188,255,0.15)', color: 'var(--app-accent)' }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>,
    document.body
  )
}

export default function LibraryView() {
  const t = useTranslation()
  const { tracks, folders, loading, updateFolder, removeFolder, setLoading } = useLibraryStore()
  const { playTrack, togglePlay, playing, currentTrack } = usePlayerStore()
  const current = currentTrack()

  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album'>('title')
  const [scanError, setScanError] = useState('')
  // Cover cache: path → dataURL (fetched lazily after scan)
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [openMenuTrackId, setOpenMenuTrackId] = useState<number | null>(null)
  const [menuAnchorRect, setMenuAnchorRect] = useState<{ top: number; right: number } | null>(null)

  // When tracks load and have coverData, fill local cover cache
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const t of tracks) {
      if (t.coverData) map[t.path] = t.coverData
    }
    if (Object.keys(map).length) setCovers((prev) => ({ ...prev, ...map }))
  }, [tracks])

  // Обложки не сохраняются в localStorage (слишком большие) — после перезапуска
  // приложения coverData у треков отсутствует. Догружаем их через IPC по одному,
  // с небольшой задержкой между запросами, чтобы не забивать main-процесс и не
  // мешать воспроизведению аудио (иначе большая библиотека без обложек лагает).
  useEffect(() => {
    let cancelled = false

    async function fetchMissingCovers() {
      const missing = tracks.filter((t) => !t.coverData && !covers[t.path])
      for (const t of missing) {
        if (cancelled) return
        try {
          const meta = await window.api.getMetadata(t.path)
          if (cancelled) return
          if (meta?.coverData) {
            setCovers((prev) => (prev[t.path] ? prev : { ...prev, [t.path]: meta.coverData as string }))
          }
        } catch (err) {
          console.error('getMetadata (cover refetch) error', err, t.path)
        }
        // Небольшая пауза между запросами — снижает нагрузку на main-процесс/диск
        await new Promise((r) => setTimeout(r, 60))
      }
    }

    if (tracks.some((t) => !t.coverData)) {
      fetchMissingCovers()
    }

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks])

  const handleAddFolder = async () => {
    setScanError('')
    setLoading(true)
    try {
      const result = await window.api.scanFolder()
      if (!result.cancelled && result.tracks) {
        updateFolder(result.folder ?? '', result.tracks)
      }
    } catch (e) {
      console.error('scan-folder error', e)
      setScanError(t('Не удалось открыть папку. Проверьте доступ и попробуйте ещё раз.', 'Could not open the folder. Check access and try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (idx: number) => {
    const track = filtered[idx]
    if (current?.path === track.path) {
      togglePlay()
    } else {
      playTrack(track, filtered, idx)
    }
  }

  const filtered = tracks.filter((t) => {
    const q = query.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    )
  }).sort((a, b) => a[sortBy].localeCompare(b[sortBy], undefined, { sensitivity: 'base' }) || a.title.localeCompare(b.title))

  const scrollRef = useRef<HTMLDivElement>(null)
  const ROW_HEIGHT = 52 // px — реальная высота строки трека (px-4 py-2 + контент)

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">{t('Библиотека', 'Library')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label={t('Сортировка библиотеки', 'Sort library')}
            className="rounded-lg px-2 py-1.5 text-sm"
            style={{ background: 'rgba(30,28,38,0.96)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <option value="title">{t('По названию', 'By title')}</option>
            <option value="artist">{t('По исполнителю', 'By artist')}</option>
            <option value="album">{t('По альбому', 'By album')}</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--text-30)' }} />
            <input
              type="text"
              aria-label={t('Поиск по библиотеке', 'Search library')}
              placeholder={t('Поиск треков…', 'Search tracks…')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm rounded-lg w-48"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--app-text)',
              }}
            />
          </div>
          <button
            onClick={handleAddFolder}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(208,188,255,0.15)', color: 'var(--app-accent)' }}
          >
            <FolderOpen size={15} />
            {loading ? t('Сканирование…', 'Scanning…') : t('Добавить папку', 'Add folder')}
          </button>
        </div>
      </div>

      {/* Count */}
      {tracks.length > 0 && (
        <p className="text-xs shrink-0 -mt-2" style={{ color: 'var(--text-35)' }}>
          {filtered.length} {t('из', 'of')} {tracks.length} {t('треков', 'tracks')}
        </p>
      )}

      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0" aria-label={t('Музыкальные папки', 'Music folders')}>
          {folders.map((folder) => (
            <div key={folder} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs" style={{ background: 'rgba(255,255,255,0.07)' }} title={folder}>
              <FolderOpen size={13} />
              <span className="max-w-44 truncate">{folder.split(/[\\/]/).filter(Boolean).pop() ?? folder}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-white/10"
                aria-label={`${t('Убрать папку из библиотеки', 'Remove folder from library')}: ${folder}`}
                onClick={() => { removeFolder(folder); void window.api.unwatchFolder(folder) }}
              ><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {scanError && <p role="alert" className="text-sm" style={{ color: '#f2b8b5' }}>{scanError}</p>}

      {/* Empty */}
      {tracks.length === 0 && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(208,188,255,0.1)' }}>
            <Music2 size={36} style={{ color: 'var(--app-accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-lg">{t('Пока нет треков', 'No tracks yet')}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-60)' }}>{t('Добавьте папку с музыкой, чтобы начать слушать', 'Add a music folder to start listening')}</p>
          </div>
          <button
            onClick={handleAddFolder}
            className="px-6 py-2.5 rounded-xl font-medium text-sm"
            style={{ background: '#d0bcff', color: '#1c1b1f' }}
          >
            {t('Добавить папку', 'Add folder')}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center gap-3" style={{ color: 'var(--text-50)' }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d0bcff', borderTopColor: 'transparent' }} />
          {t('Сканирование папки…', 'Scanning folder…')}
        </div>
      )}

      {!loading && tracks.length > 0 && filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center" role="status">
          <Search size={26} style={{ color: 'var(--app-accent)' }} />
          <p className="font-medium">{t('Ничего не найдено', 'No matches')}</p>
          <p className="text-sm" style={{ color: 'var(--text-60)' }}>{t('Попробуйте другое название, исполнителя или альбом', 'Try another title, artist or album')}</p>
        </div>
      )}

      {/* Track list */}
      {!loading && filtered.length > 0 && (
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {/* Column headers */}
          <div
            className="grid gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-widest sticky top-0 z-10"
            style={{
              color: 'var(--text-30)',
              background: 'rgba(20,18,28,0.92)',
              gridTemplateColumns: '32px 44px 1fr 1fr 56px 32px',
            }}
          >
            <span>#</span>
            <span />
            <span>{t('Название / исполнитель', 'Title / artist')}</span>
            <span>{t('Альбом', 'Album')}</span>
            <span className="text-right">{t('Время', 'Time')}</span>
            <span />
          </div>

          {/* Виртуализированный список — рендерятся только видимые строки */}
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const idx = virtualRow.index
              const track = filtered[idx]
              const isCurrentTrack = current?.path === track.path
              const isPlayingNow = isCurrentTrack && playing
              const cover = covers[track.path] ?? track.coverData

              return (
                <div
                  key={track.path}
                  onClick={() => handlePlay(idx)}
                  className="grid gap-3 px-4 py-2 items-center cursor-pointer transition-all group focus-within:bg-white/5"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: '32px 44px 1fr 1fr 56px 32px',
                    background: isCurrentTrack ? 'rgba(208,188,255,0.1)' : undefined,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => { if (!isCurrentTrack) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { if (!isCurrentTrack) (e.currentTarget as HTMLDivElement).style.background = '' }}
                >
                  {/* # / play indicator */}
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); handlePlay(idx) }}
                    aria-label={`${isPlayingNow ? t('Пауза', 'Pause') : t('Воспроизвести', 'Play')}: ${track.title}`}
                    className="text-xs flex items-center justify-center w-8 h-8 rounded-full"
                    style={{ color: 'var(--text-50)' }}
                  >
                    {isPlayingNow
                      ? <Pause size={12} fill="currentColor" style={{ color: 'var(--app-accent)' }} />
                      : isCurrentTrack
                        ? <Play size={12} fill="currentColor" style={{ color: 'var(--app-accent)' }} />
                        : (
                          <>
                            <span className="group-hover:hidden">{idx + 1}</span>
                            <Play size={12} fill="currentColor" style={{ color: 'var(--app-accent)' }} className="hidden group-hover:block" />
                          </>
                        )
                    }
                  </button>

                  {/* Cover art */}
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    {cover
                      ? <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                      : <Music2 size={18} style={{ color: 'var(--text-30)' }} />
                    }
                  </div>

                  {/* Title + Artist */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isCurrentTrack ? 'var(--app-accent)' : 'var(--app-text)' }}>
                      {track.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-40)' }}>
                      {track.artist}
                    </p>
                  </div>

                  {/* Album */}
                  <p className="text-sm truncate" style={{ color: 'var(--text-40)' }}>
                    {track.album}
                  </p>

                  {/* Duration */}
                  <p className="text-xs text-right" style={{ color: 'var(--text-30)' }}>
                    {formatTime(track.duration)}
                  </p>

                  {/* Add to playlist */}
                  <div className="relative flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                        if (openMenuTrackId === track.id) {
                          setOpenMenuTrackId(null)
                          setMenuAnchorRect(null)
                        } else {
                          setMenuAnchorRect({
                            top: rect.bottom + 4,
                            right: window.innerWidth - rect.right,
                          })
                          setOpenMenuTrackId(track.id)
                        }
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center player-btn opacity-0 group-hover:opacity-100 focus:opacity-100"
                      style={{ opacity: openMenuTrackId === track.id ? 1 : undefined }}
                      title={t('Действия с треком', 'Track actions')}
                      aria-label={`${t('Действия с треком', 'Track actions')}: ${track.title}`}
                    >
                      <Plus size={14} />
                    </button>
                    {openMenuTrackId === track.id && menuAnchorRect && (
                      <AddToPlaylistMenu
                        track={track}
                        anchorRect={menuAnchorRect}
                        onClose={() => { setOpenMenuTrackId(null); setMenuAnchorRect(null) }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
