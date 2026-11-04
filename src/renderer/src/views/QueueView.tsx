import { Music2, Play, Pause, X, ListX } from 'lucide-react'
import { usePlayerStore } from '../stores/playerStore'
import { useThemeStore } from '../stores/themeStore'
import { useTranslation } from '../lib/i18n'

function formatTime(s: number) {
  if (!s || s < 0) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function QueueView() {
  const t = useTranslation()
  const { queue, currentIndex, playing, playFromQueue, removeFromQueue, clearQueue, togglePlay } = usePlayerStore()
  const theme = useThemeStore((s) => s.getTheme())

  const handleRowClick = (idx: number) => {
    if (idx === currentIndex) {
      togglePlay()
    } else {
      playFromQueue(idx)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">{t('Очередь', 'Queue')}</h1>
          {queue.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-35)' }}>
              {queue.length} {t(queue.length === 1 ? 'трек в очереди' : 'треков в очереди', queue.length === 1 ? 'track in queue' : 'tracks in queue')}
            </p>
          )}
        </div>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium player-btn"
            style={{ background: 'rgba(244,143,177,0.12)', color: '#f48fb1' }}
          >
            <ListX size={14} />
            {t('Очистить очередь', 'Clear queue')}
          </button>
        )}
      </div>

      {/* Empty state */}
      {queue.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(208,188,255,0.1)' }}>
            <Music2 size={36} style={{ color: theme.accent }} />
          </div>
          <div>
            <p className="font-semibold text-lg">{t('Очередь пуста', 'Queue is empty')}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-40)' }}>
              {t('Запустите воспроизведение трека или плейлиста, чтобы увидеть очередь здесь', 'Play a track or playlist to see its queue here')}
            </p>
          </div>
        </div>
      )}

      {/* Queue list */}
      {queue.length > 0 && (
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

          {queue.map((track, idx) => {
            const isCurrentTrack = idx === currentIndex
            const isPlayingNow = isCurrentTrack && playing

            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => handleRowClick(idx)}
                className="grid gap-3 px-4 py-2 items-center cursor-pointer transition-all group"
                style={{
                  gridTemplateColumns: '32px 44px 1fr 1fr 56px 32px',
                  background: isCurrentTrack ? `${theme.accent}1a` : undefined,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => { if (!isCurrentTrack) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={(e) => { if (!isCurrentTrack) (e.currentTarget as HTMLDivElement).style.background = '' }}
              >
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); handleRowClick(idx) }}
                  aria-label={`${isPlayingNow ? t('Пауза', 'Pause') : t('Воспроизвести', 'Play')}: ${track.title}`}
                  className="text-xs flex items-center justify-center w-8 h-8 rounded-full"
                  style={{ color: 'var(--text-50)' }}
                >
                  {isPlayingNow
                    ? <Pause size={12} fill="currentColor" style={{ color: theme.accent }} />
                    : isCurrentTrack
                      ? <Play size={12} fill="currentColor" style={{ color: theme.accent }} />
                      : (
                        <>
                          <span className="group-hover:hidden">{idx + 1}</span>
                          <Play size={12} fill="currentColor" style={{ color: theme.accent }} className="hidden group-hover:block" />
                        </>
                      )
                  }
                </button>

                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center overflow-hidden shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  {track.coverData
                    ? <img src={track.coverData} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <Music2 size={18} style={{ color: 'var(--text-30)' }} />
                  }
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isCurrentTrack ? theme.accent : 'inherit' }}>
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
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(idx) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center player-btn opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title={t('Убрать из очереди', 'Remove from queue')}
                  aria-label={`${t('Убрать', 'Remove')} ${track.title} ${t('из очереди', 'from queue')}`}
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
