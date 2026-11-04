import { useCallback, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, Shuffle, Repeat, Repeat1 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { useThemeStore } from '../../stores/themeStore'
import NowPlayingOverlay from './NowPlayingOverlay'
import { useTranslation } from '../../lib/i18n'
import type { CoverRect } from '../../lib/playerMotion'

function formatTime(s: number) {
  if (!s || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function BottomPlayer() {
  const t = useTranslation()
  const {
    playing,
    progress,
    seek,
    duration,
    volume,
    shuffle,
    changeDirection,
    repeatMode,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
    currentTrack,
  } = usePlayerStore()

  const theme = useThemeStore((s) => s.getTheme())

  const track = currentTrack()
  const trackSlideStyle = { '--track-enter-x': changeDirection === 'prev' ? '-18px' : '18px' } as React.CSSProperties
  const [showNowPlaying, setShowNowPlaying] = useState(false)
  const coverButtonRef = useRef<HTMLButtonElement>(null)
  const getCoverRect = useCallback((): CoverRect | null => coverButtonRef.current?.getBoundingClientRect() ?? null, [])
  const closeNowPlaying = useCallback(() => {
    setShowNowPlaying(false)
    coverButtonRef.current?.focus()
  }, [])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value) / 100)
  }

  const lastVolumeRef = useRef(volume > 0 ? volume : 0.8)
  const handleMuteToggle = () => {
    if (volume > 0) {
      lastVolumeRef.current = volume
      setVolume(0)
    } else {
      setVolume(lastVolumeRef.current || 0.8)
    }
  }

  return (
    <>
    <div
      className="h-20 px-4 flex items-center gap-4 shrink-0"
      style={{
        background: 'var(--wallpaper-panel, rgba(20,18,28,0.97))',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Track info */}
      <div className="flex items-center gap-3 w-64 shrink-0">
        <button
          ref={coverButtonRef}
          onClick={() => track && setShowNowPlaying(true)}
          disabled={!track}
          aria-label={track ? `${t('Открыть плеер', 'Open player')}: ${track.title}` : t('Нет выбранного трека', 'No track selected')}
          className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0 transition-transform disabled:cursor-default"
          style={{ background: 'rgba(255,255,255,0.08)', cursor: track ? 'pointer' : 'default' }}
          onMouseEnter={(e) => { if (track) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          title={track ? t('Открыть полноэкранный плеер', 'Open full-screen player') : undefined}
        >
          <span key={track?.path ?? 'empty'} className="mini-track-enter w-full h-full flex items-center justify-center" style={trackSlideStyle}>
            {track?.coverData
              ? <img src={track.coverData} alt="" className="w-full h-full object-cover" />
              : <Music2 size={22} style={{ color: 'rgba(255,255,255,0.3)' }} />
            }
          </span>
        </button>
        <div key={track?.path ?? 'empty'} className="mini-track-enter min-w-0 flex-1" style={trackSlideStyle}>
          <p className="text-sm font-medium truncate" style={{ color: track ? 'white' : 'rgba(255,255,255,0.3)' }}>
            {track ? track.title : t('Ничего не играет', 'Nothing playing')}
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {track ? track.artist : t('Выберите трек', 'Select a track')}
          </p>
        </div>
      </div>

      {/* Center — controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-2">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            aria-label={t('Перемешивание', 'Shuffle')}
            aria-pressed={shuffle}
            className="player-btn"
            style={{ color: shuffle ? theme.accent : undefined }}
            title={t('Перемешивание', 'Shuffle')}
          >
            <Shuffle size={17} />
          </button>

          <button
            onClick={playPrev}
            aria-label={t('Предыдущий трек', 'Previous track')}
            disabled={!track}
            className="player-btn"
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlay}
            aria-label={playing ? t('Пауза', 'Pause') : t('Воспроизвести', 'Play')}
            disabled={!track}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: '#d0bcff', color: '#1c1b1f' }}
          >
            {playing
              ? <Pause size={16} fill="currentColor" />
              : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
            }
          </button>

          <button
            onClick={playNext}
            aria-label={t('Следующий трек', 'Next track')}
            disabled={!track}
            className="player-btn"
          >
            <SkipForward size={20} />
          </button>

          <button
            onClick={cycleRepeatMode}
            aria-label={t('Режим повтора', 'Repeat mode')}
            aria-pressed={repeatMode !== 'off'}
            className="player-btn"
            style={{ color: repeatMode !== 'off' ? theme.accent : undefined }}
            title={
              repeatMode === 'off' ? t('Повтор выключен', 'Repeat off')
                : repeatMode === 'all' ? t('Повтор очереди', 'Repeat queue')
                : t('Повтор трека', 'Repeat track')
            }
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 w-full max-w-lg">
          <span className="text-xs w-8 text-right shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {formatTime(seek)}
          </span>

          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            onChange={(event) => seekTo(Number(event.target.value) / 1000)}
            disabled={!track}
            aria-label={t('Позиция воспроизведения', 'Playback position')}
            aria-valuetext={`${formatTime(seek)} ${t('из', 'of')} ${formatTime(duration)}`}
            className="app-slider"
            style={{ '--slider-progress': `${progress * 100}%` } as React.CSSProperties}
          />

          <span className="text-xs w-8 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-32 shrink-0">
        <button
          onClick={handleMuteToggle}
          aria-label={volume === 0 ? t('Включить звук', 'Unmute') : t('Выключить звук', 'Mute')}
          className="player-btn"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={handleVolumeChange}
          aria-label={t('Громкость', 'Volume')}
          className="app-slider flex-1"
          style={{ '--slider-progress': `${volume * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>

    {showNowPlaying && track && (
      <NowPlayingOverlay onClose={closeNowPlaying} getOriginRect={getCoverRect} />
    )}
    </>
  )
}
