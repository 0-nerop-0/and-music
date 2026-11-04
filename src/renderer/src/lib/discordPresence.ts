// ── Discord Rich Presence sync ──────────────────────────────────────────────
// Мост между zustand-стором настроек (включено/Client ID) и стором плеера
// (что сейчас играет) с одной стороны, и IPC-хендлерами discord:* в main
// процессе с другой. Не React-хук — вызывается один раз при старте приложения.

import { useSettingsStore } from '../stores/settingsStore'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../stores/libraryStore'

let connected = false
let lastClientId = ''

async function applyConnectionState() {
  const { discordEnabled, discordClientId } = useSettingsStore.getState()

  if (discordEnabled) {
    if (!connected || lastClientId !== discordClientId) {
      lastClientId = discordClientId
      const res = await window.api.discordEnable(discordClientId || undefined)
      connected = res.ok
      if (!res.ok) {
        console.error('Discord enable failed:', res.error)
      } else {
        pushPresence()
      }
    }
  } else if (connected) {
    connected = false
    await window.api.discordDisable()
  }
}

function pushPresence() {
  if (!connected) return

  const track: Track | null = usePlayerStore.getState().currentTrack()
  if (!track) {
    window.api.discordUpdatePresence(null)
    return
  }

  const { playing, seek, duration } = usePlayerStore.getState()

  window.api.discordUpdatePresence({
    title: track.title,
    artist: track.artist,
    isPlaying: playing,
    seek,
    duration,
  })
}

// При смене трека zustand-подписка обычно триггерится дважды почти одновременно:
// сразу на trackChanged (currentIndex меняется синхронно) и чуть позже на
// playingChanged (когда howl реально запускается в onplay). Без дебаунса это
// два параллельных IPC-вызова к main-процессу, чей порядок ответа от Discord
// IPC не гарантирован — устаревший вызов мог перезаписать актуальный, из-за
// чего presence "зависал" на предыдущем треке. Схлопываем такие всплески в
// один вызов с самым свежим состоянием.
let pushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePushPresence() {
  if (pushTimer !== null) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    pushPresence()
  }, 60)
}

export function initDiscordPresence(): void {
  // Первичное применение состояния (например, если пользователь ранее включил presence)
  applyConnectionState()

  // Изменения настроек (переключатель / смена Client ID) — переподключаемся
  useSettingsStore.subscribe((state, previous) => {
    if (state.discordEnabled !== previous.discordEnabled || state.discordClientId !== previous.discordClientId) {
      applyConnectionState()
    }
  })

  // Изменения плеера — обновляем активность, если presence включён.
  // Реагируем только на смену трека и play/pause, а не на каждый тик прогресса,
  // чтобы не спамить IPC 4 раза в секунду.
  let prevTrackPath: string | null = null
  let prevPlaying = false

  usePlayerStore.subscribe((state) => {
    const track = state.currentTrack()
    const trackChanged = track?.path !== prevTrackPath
    const playingChanged = state.playing !== prevPlaying

    if (trackChanged || playingChanged) {
      prevTrackPath = track?.path ?? null
      prevPlaying = state.playing
      schedulePushPresence()
    }
  })
}
