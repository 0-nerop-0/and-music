import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ListMusic, Plus, Trash2, Play, Pause, Music2, X, Pencil, Check } from 'lucide-react'
import { usePlaylistStore } from '../stores/playlistStore'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useTranslation } from '../lib/i18n'

function formatTime(s: number) {
  if (!s || s < 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function PlaylistsView() {
  const t = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { playlists, createPlaylist, renamePlaylist, deletePlaylist, removeTrackFromPlaylist, getPlaylistTracks } =
    usePlaylistStore()
  const { tracks } = useLibraryStore()
  const { playTrack, togglePlay, playing, currentTrack } = usePlayerStore()
  const current = currentTrack()

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const activePlaylist = id ? playlists.find((p) => p.id === id) : null

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    const pl = createPlaylist(name)
    setNewName('')
    setCreating(false)
    navigate(`/playlists/${pl.id}`)
  }

  const handleDelete = (playlistId: string) => {
    deletePlaylist(playlistId)
    if (id === playlistId) navigate('/playlists')
  }

  const startRename = (playlistId: string, current: string) => {
    setRenamingId(playlistId)
    setRenameValue(current)
  }

  const commitRename = () => {
    if (renamingId) renamePlaylist(renamingId, renameValue)
    setRenamingId(null)
  }

  // ── Detail view of a single playlist ────────────────────────────────────
  if (activePlaylist) {
    const plTracks = getPlaylistTracks(activePlaylist.id, tracks)

    const handlePlay = (idx: number) => {
      const track = plTracks[idx]
      if (current?.id === track.id) {
        togglePlay()
      } else {
        playTrack(track, plTracks, idx)
      }
    }

    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/playlists')}
              aria-label={t('Вернуться к плейлистам', 'Back to playlists')}
              className="w-8 h-8 rounded-full flex items-center justify-center player-btn shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{activePlaylist.name}</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-35)' }}>
                {plTracks.length} {t(plTracks.length === 1 ? 'трек' : 'треков', plTracks.length === 1 ? 'track' : 'tracks')}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(activePlaylist.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium player-btn shrink-0"
            style={{ background: 'rgba(244,143,177,0.12)', color: '#f48fb1' }}
          >
            <Trash2 size={14} />
            {t('Удалить плейлист', 'Delete playlist')}
          </button>
        </div>

        {plTracks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(208,188,255,0.1)' }}>
              <Music2 size={36} style={{ color: 'var(--app-accent)' }} />
            </div>
            <div>
              <p className="font-semibold text-lg">{t('Плейлист пуст', 'Playlist is empty')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-40)' }}>
                {t('Откройте «Библиотеку» и нажмите «+» на треке, чтобы добавить его сюда', 'Open Library and select “+” on a track to add it here')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
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

            {plTracks.map((track, idx) => {
              const isCurrentTrack = current?.id === track.id
              const isPlayingNow = isCurrentTrack && playing

              return (
                <div
                  key={track.id}
                  onClick={() => handlePlay(idx)}
                  className="grid gap-3 px-4 py-2 items-center cursor-pointer transition-all group"
                  style={{
                    gridTemplateColumns: '32px 44px 1fr 1fr 56px 32px',
                    background: isCurrentTrack ? 'rgba(208,188,255,0.1)' : undefined,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) => { if (!isCurrentTrack) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { if (!isCurrentTrack) (e.currentTarget as HTMLDivElement).style.background = '' }}
                >
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

                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    {track.coverData
                      ? <img src={track.coverData} alt="" className="w-full h-full object-cover" />
                      : <Music2 size={18} style={{ color: 'var(--text-30)' }} />
                    }
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isCurrentTrack ? 'var(--app-accent)' : 'var(--app-text)' }}>
                      {track.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-40)' }}>
                      {track.artist}
                    </p>
                  </div>

                  <p className="text-sm truncate" style={{ color: 'var(--text-40)' }}>
                    {track.album}
                  </p>

                  <p className="text-xs text-right" style={{ color: 'var(--text-30)' }}>
                    {formatTime(track.duration)}
                  </p>

                  <button
                    onClick={(e) => { e.stopPropagation(); removeTrackFromPlaylist(activePlaylist.id, track.path) }}
                    className="w-8 h-8 rounded-full flex items-center justify-center player-btn opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title={t('Убрать из плейлиста', 'Remove from playlist')}
                    aria-label={`${t('Убрать', 'Remove')} ${track.title} ${t('из плейлиста', 'from playlist')}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── List of all playlists ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <h1 className="text-2xl font-bold">{t('Плейлисты', 'Playlists')}</h1>

        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setCreating(false); setNewName('') }
              }}
              placeholder={t('Название плейлиста…', 'Playlist name…')}
              aria-label={t('Название нового плейлиста', 'New playlist name')}
              className="px-3 py-1.5 text-sm rounded-lg w-52"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--app-text)',
              }}
            />
            <button
              onClick={handleCreate}
              aria-label={t('Создать плейлист', 'Create playlist')}
              className="w-8 h-8 rounded-lg flex items-center justify-center player-btn"
              style={{ background: 'rgba(208,188,255,0.15)', color: 'var(--app-accent)' }}
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              aria-label={t('Отменить создание плейлиста', 'Cancel playlist creation')}
              className="w-8 h-8 rounded-lg flex items-center justify-center player-btn"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(208,188,255,0.15)', color: 'var(--app-accent)' }}
          >
            <Plus size={15} />
            {t('Новый плейлист', 'New playlist')}
          </button>
        )}
      </div>

      {playlists.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(208,188,255,0.1)' }}>
            <ListMusic size={36} style={{ color: 'var(--app-accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-lg">{t('Нет плейлистов', 'No playlists')}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-40)' }}>{t('Создайте первый плейлист', 'Create your first playlist')}</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-6 py-2.5 rounded-xl font-medium text-sm"
            style={{ background: '#d0bcff', color: '#1c1b1f' }}
          >
            {t('Новый плейлист', 'New playlist')}
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
          {playlists.map((pl) => {
            const count = pl.trackPaths.length
            return (
              <div
                key={pl.id}
                onClick={() => navigate(`/playlists/${pl.id}`)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    navigate(`/playlists/${pl.id}`)
                  }
                }}
                role="link"
                tabIndex={0}
                aria-label={`${t('Открыть плейлист', 'Open playlist')} ${pl.name}`}
                className="rounded-xl p-4 cursor-pointer transition-all group relative flex flex-col gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)')}
              >
                <div
                  className="w-full h-28 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{ background: pl.cover ? undefined : 'rgba(208,188,255,0.1)' }}
                >
                  {pl.cover
                    ? <img src={pl.cover} alt="" className="w-full h-full object-cover" />
                    : <ListMusic size={32} style={{ color: 'var(--app-accent)' }} />
                  }
                </div>

                <div className="flex items-center justify-between gap-2 min-w-0">
                  {renamingId === pl.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      aria-label={`${t('Переименовать плейлист', 'Rename playlist')} ${pl.name}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={commitRename}
                      className="px-2 py-1 text-sm rounded-md flex-1 min-w-0"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--app-text)' }}
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{pl.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-40)' }}>
                        {count} {t(count === 1 ? 'трек' : 'треков', count === 1 ? 'track' : 'tracks')}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(pl.id, pl.name) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center player-btn"
                      title={t('Переименовать', 'Rename')}
                      aria-label={`${t('Переименовать', 'Rename')} ${pl.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(pl.id) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center player-btn"
                      title={t('Удалить', 'Delete')}
                      aria-label={`${t('Удалить', 'Delete')} ${pl.name}`}
                      style={{ color: 'rgba(244,143,177,0.8)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
