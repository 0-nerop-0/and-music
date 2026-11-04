import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, ChevronDown, Shuffle, Repeat, Repeat1 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { useThemeStore } from '../../stores/themeStore'
import { useTranslation } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { coverStartTransform, type CoverRect } from '../../lib/playerMotion'
import type { Track } from '../../stores/libraryStore'

function formatTime(s: number) {
  if (!s || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface NowPlayingOverlayProps {
  onClose: () => void
  getOriginRect: () => CoverRect | null
}

function measureCoverLayout(cover: HTMLDivElement): CoverRect {
  // offset* values describe the layout box even while CSS is transforming it.
  const parent = cover.offsetParent as HTMLElement | null
  const parentRect = parent?.getBoundingClientRect()
  return {
    left: (parentRect?.left ?? 0) + cover.offsetLeft,
    top: (parentRect?.top ?? 0) + cover.offsetTop,
    width: cover.offsetWidth,
    height: cover.offsetHeight,
  }
}

function TrackArtwork({ track }: { track: Track }) {
  return track.coverData
    ? <img src={track.coverData} alt="" className="w-full h-full object-cover" />
    : <Music2 size={80} style={{ color: 'rgba(255,255,255,0.25)' }} />
}

function TrackCaption({ track }: { track: Track }) {
  return (
    <>
      <p className="text-xl font-semibold truncate" title={track.title}>{track.title}</p>
      <p className="text-sm mt-1 truncate" style={{ color: 'rgba(255,255,255,0.5)' }} title={track.artist}>{track.artist}</p>
    </>
  )
}

export default function NowPlayingOverlay({ onClose, getOriginRect }: NowPlayingOverlayProps) {
  const t = useTranslation()
  const motionMode = useSettingsStore((state) => state.motionMode)
  const [expanded, setExpanded] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const closingRef = useRef(false)
  const finishedRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const swapTimerRef = useRef<number | null>(null)
  const swapSequenceRef = useRef(0)
  const {
    playing,
    progress,
    seek,
    duration,
    volume,
    shuffle,
    repeatMode,
    changeDirection,
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
  const previousTrackRef = useRef(track)
  const [outgoingTrack, setOutgoingTrack] = useState<{ track: Track; sequence: number; direction: 'next' | 'prev' } | null>(null)
  const lastVolumeRef = useRef(volume > 0 ? volume : 0.8)

  const reducedMotion = motionMode === 'off' || (motionMode === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useLayoutEffect(() => {
    const previous = previousTrackRef.current
    previousTrackRef.current = track
    if (reducedMotion) {
      if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current)
      setOutgoingTrack(null)
      return
    }
    if (!track || !previous || previous.path === track.path) return
    if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current)
    const sequence = ++swapSequenceRef.current
    setOutgoingTrack({ track: previous, sequence, direction: changeDirection === 'prev' ? 'prev' : 'next' })
    swapTimerRef.current = window.setTimeout(() => {
      setOutgoingTrack((current) => current?.sequence === sequence ? null : current)
      swapTimerRef.current = null
    }, 340)
  }, [track, changeDirection, reducedMotion])

  useEffect(() => () => {
    if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current)
  }, [])

  const finishClose = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    onClose()
  }, [onClose])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (reducedMotion) {
      finishClose()
      return
    }
    if (!expanded) {
      finishClose()
      return
    }
    const cover = coverRef.current
    if (cover) {
      cover.style.setProperty('--cover-start-transform', coverStartTransform(getOriginRect(), measureCoverLayout(cover)))
    }
    setExpanded(false)
    closeTimerRef.current = window.setTimeout(finishClose, 500)
  }, [expanded, finishClose, getOriginRect, reducedMotion])

  useLayoutEffect(() => {
    const cover = coverRef.current
    if (cover) cover.style.setProperty('--cover-start-transform', coverStartTransform(getOriginRect(), measureCoverLayout(cover)))
    closeButtonRef.current?.focus()
    if (reducedMotion) {
      setExpanded(true)
      return
    }
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setExpanded(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
    // Opening geometry is captured once; player progress updates must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
  }, [])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value) / 100)
  }

  const handleMuteToggle = () => {
    if (volume > 0) {
      lastVolumeRef.current = volume
      setVolume(0)
    } else {
      setVolume(lastVolumeRef.current || 0.8)
    }
  }

  if (!track) return null

  const slideStyle = {
    '--track-enter-x': outgoingTrack?.direction === 'prev' ? '-44px' : '44px',
    '--track-exit-x': outgoingTrack?.direction === 'prev' ? '44px' : '-44px',
  } as React.CSSProperties

  return (
    <div
      ref={overlayRef}
      className="now-playing-overlay fixed inset-0 z-50 flex flex-col items-center"
      data-expanded={expanded}
      role="dialog"
      aria-modal="true"
      aria-label={t('Большой плеер', 'Expanded player')}
      onTransitionEnd={(event) => {
        if (event.target === overlayRef.current && event.propertyName === 'opacity' && closingRef.current) finishClose()
      }}
      style={{ background: 'rgba(12,10,16,0.98)', backdropFilter: 'blur(20px)' }}
    >
      {/* Close */}
      <button
        ref={closeButtonRef}
        onClick={requestClose}
        className="now-playing-close absolute top-5 left-5 w-10 h-10 rounded-full flex items-center justify-center player-btn z-10"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        title={t('Свернуть', 'Close player')}
        aria-label={t('Свернуть плеер', 'Close player')}
      >
        <ChevronDown size={20} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-md px-6">
        {/* Large cover art */}
        <div
          ref={coverRef}
          className="now-playing-cover relative w-full aspect-square overflow-hidden flex items-center justify-center shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', maxWidth: 360 }}
        >
          <div className="absolute inset-0" style={slideStyle}>
            {outgoingTrack && (
              <div key={`old-${outgoingTrack.sequence}`} className="track-swap-layer track-swap-art track-swap-out" aria-hidden="true">
                <TrackArtwork track={outgoingTrack.track} />
              </div>
            )}
            <div key={track.path} className={`track-swap-layer track-swap-art ${outgoingTrack ? 'track-swap-in' : ''}`}>
              <TrackArtwork track={track} />
            </div>
          </div>
        </div>

        {/* Title / Artist */}
        <div className="now-playing-details relative text-center w-full min-w-0 h-14" style={slideStyle}>
          {outgoingTrack && (
            <div key={`old-caption-${outgoingTrack.sequence}`} className="track-swap-layer track-swap-out" aria-hidden="true">
              <TrackCaption track={outgoingTrack.track} />
            </div>
          )}
          <div key={track.path} className={`track-swap-layer ${outgoingTrack ? 'track-swap-in' : ''}`}>
            <TrackCaption track={track} />
          </div>
        </div>

        {/* Progress */}
        <div className="now-playing-details flex items-center gap-3 w-full">
          <span className="text-xs w-10 text-right shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {formatTime(seek)}
          </span>

          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            onChange={(event) => seekTo(Number(event.target.value) / 1000)}
            aria-label={t('Позиция воспроизведения', 'Playback position')}
            className="app-slider"
            style={{ '--slider-progress': `${progress * 100}%` } as React.CSSProperties}
          />

          <span className="text-xs w-10 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Transport controls */}
        <div className="now-playing-details flex items-center gap-6">
          <button
            onClick={toggleShuffle}
            className="player-btn"
            style={{ color: shuffle ? theme.accent : undefined }}
            title={t('Перемешивание', 'Shuffle')}
            aria-label={t('Перемешивание', 'Shuffle')}
          >
            <Shuffle size={20} />
          </button>

          <button onClick={playPrev} className="player-btn" aria-label={t('Предыдущий трек', 'Previous track')}>
            <SkipBack size={26} />
          </button>

          <button
            onClick={togglePlay}
            aria-label={playing ? t('Пауза', 'Pause') : t('Воспроизвести', 'Play')}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: theme.accent, color: '#1c1b1f' }}
          >
            {playing
              ? <Pause size={24} fill="currentColor" />
              : <Play size={24} fill="currentColor" style={{ marginLeft: 2 }} />
            }
          </button>

          <button onClick={playNext} className="player-btn" aria-label={t('Следующий трек', 'Next track')}>
            <SkipForward size={26} />
          </button>

          <button
            onClick={cycleRepeatMode}
            className="player-btn"
            style={{ color: repeatMode !== 'off' ? theme.accent : undefined }}
            title={
              repeatMode === 'off' ? t('Повтор выключен', 'Repeat off')
                : repeatMode === 'all' ? t('Повтор очереди', 'Repeat queue')
                : t('Повтор трека', 'Repeat track')
            }
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        {/* Volume */}
        <div className="now-playing-details flex items-center gap-3 w-full max-w-xs">
          <button onClick={handleMuteToggle} aria-label={volume === 0 ? t('Включить звук', 'Unmute') : t('Выключить звук', 'Mute')} className="player-btn" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
    </div>
  )
}
