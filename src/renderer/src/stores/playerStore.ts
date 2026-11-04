import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Howl } from 'howler'
import type { Track } from './libraryStore'
import { useLibraryStore } from './libraryStore'
import { useSettingsStore } from './settingsStore'
import { insertInQueue, type QueuePlacement } from '../lib/queue'

interface PlayerState {
  // State
  queue: Track[]
  currentIndex: number
  playing: boolean
  progress: number   // 0..1
  seek: number       // seconds
  duration: number   // seconds
  volume: number     // 0..1
  repeatMode: 'off' | 'all' | 'one'
  shuffle: boolean
  changeDirection: 'next' | 'prev' | 'none'

  // Actions
  loadQueue: (tracks: Track[], startIndex: number) => void
  enqueueTrack: (track: Track, placement: QueuePlacement) => void
  playTrack: (track: Track, queue: Track[], index: number) => void
  playFromQueue: (index: number) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  seekTo: (ratio: number) => void
  setVolume: (v: number) => void
  toggleShuffle: () => void
  cycleRepeatMode: () => void
  currentTrack: () => Track | null
}

let howl: Howl | null = null
let rafId: number | null = null
// Токен для отмены "устаревшей" асинхронной загрузки при быстром переключении треков
let loadToken = 0

function stopHowl(fadeOutMs = 0) {
  loadToken++
  if (howl) {
    const oldHowl = howl
    howl = null
    if (fadeOutMs > 0 && oldHowl.playing()) {
      let cleaned = false
      const cleanup = () => {
        if (cleaned) return
        cleaned = true
        oldHowl.stop()
        oldHowl.unload()
      }
      window.setTimeout(cleanup, fadeOutMs + 100)
      oldHowl.fade(oldHowl.volume() as number, 0, fadeOutMs)
    } else {
      oldHowl.stop()
      oldHowl.unload()
    }
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

export const usePlayerStore = create<PlayerState>()(persist((set, get) => {
  function startProgressLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId)
    let lastCommit = 0
    const COMMIT_INTERVAL = 250 // ms — обновляем React-state ~4 раза/сек вместо 60 (снижает нагрузку/лаги)
    const tick = (now: number) => {
      if (!howl || !howl.playing()) return
      if (now - lastCommit >= COMMIT_INTERVAL) {
        lastCommit = now
        const seek = (howl.seek() as number) || 0
        const dur = howl.duration() || 0
        set({ seek, duration: dur, progress: dur > 0 ? seek / dur : 0 })
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  // Обложки не сохраняются в localStorage — после перезапуска приложения у трека
  // может не быть coverData. Догружаем её при воспроизведении и обновляем и очередь,
  // и общую библиотеку, чтобы обложка не "терялась" при повторном открытии.
  // myToken защищает от накопления устаревших запросов при быстром shuffle/next:
  // если пользователь уже переключился на другой трек, результат просто отбрасывается.
  async function ensureCoverData(track: Track, myToken: number) {
    if (track.coverData) return
    try {
      const meta = await window.api.getMetadata(track.path)
      if (myToken !== loadToken) return
      if (!meta?.coverData) return

      set((state) => ({
        queue: state.queue.map((t) => (t.path === track.path ? { ...t, coverData: meta.coverData } : t)),
      }))

      const lib = useLibraryStore.getState()
      if (lib.tracks.some((t) => t.path === track.path && !t.coverData)) {
        useLibraryStore.setState({
          tracks: lib.tracks.map((t) => (t.path === track.path ? { ...t, coverData: meta.coverData } : t)),
        })
      }
    } catch (err) {
      console.error('ensureCoverData error', err, track.path)
    }
  }

  async function playHowl(track: Track) {
    const fadeSeconds = useSettingsStore.getState().fadeSeconds
    stopHowl(fadeSeconds * 1000)
    // Сбрасываем время сразу, а не только когда новый трек реально начнёт играть —
    // иначе пока грузится новый файл, UI ещё показывает seek/duration от предыдущего
    // трека ("время багается": скачет/не совпадает с реальным треком на экране).
    set({ playing: false, seek: 0, progress: 0, duration: track.duration || 0 })
    const myToken = loadToken
    ensureCoverData(track, myToken)

    let url: string
    try {
      const res = await window.api.readAudioFile(track.path)
      if (myToken !== loadToken) return // трек уже сменился — не запускаем устаревшую загрузку
      if (!res.ok || !res.dataUrl) {
        console.error('Failed to read audio file:', track.path, res.error)
        set({ playing: false })
        return
      }
      url = res.dataUrl
    } catch (err) {
      if (myToken !== loadToken) return
      console.error('IPC read-audio-file error:', err, track.path)
      set({ playing: false })
      return
    }

    if (myToken !== loadToken) return

    let hasStarted = false
    howl = new Howl({
      src: [url],
      html5: true,
      volume: fadeSeconds > 0 ? 0 : get().volume,
      onplay: () => {
        if (myToken !== loadToken) return
        if (!hasStarted) {
          hasStarted = true
          if (fadeSeconds > 0) howl?.fade(0, get().volume, fadeSeconds * 1000)
        }
        set({ playing: true, duration: howl?.duration() ?? 0 })
        startProgressLoop()
      },
      onpause: () => {
        if (myToken !== loadToken) return
        set({ playing: false })
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
      },
      onstop: () => {
        if (myToken !== loadToken) return
        set({ playing: false, seek: 0, progress: 0 })
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
      },
      onend: () => {
        if (myToken !== loadToken) return
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
        if (get().repeatMode === 'one') {
          // Повторяем тот же трек
          howl?.seek(0)
          howl?.play()
          return
        }
        get().playNext()
      },
      onloaderror: (_id, err) => {
        console.error('Howl load error:', err, track.path)
        if (myToken !== loadToken) return
        set({ playing: false })
      },
      onplayerror: (_id, err) => {
        console.error('Howl play error:', err, track.path)
        if (myToken !== loadToken) return
        set({ playing: false })
      },
    })

    howl.play()
  }

  return {
    queue: [],
    currentIndex: -1,
    playing: false,
    progress: 0,
    seek: 0,
    duration: 0,
    volume: useSettingsStore.getState().masterVolume,
    repeatMode: 'off',
    shuffle: false,
    changeDirection: 'none',

    currentTrack: () => {
      const { queue, currentIndex } = get()
      return currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null
    },

    loadQueue: (tracks, startIndex) => {
      set({ queue: tracks, currentIndex: startIndex, changeDirection: 'none' })
    },

    enqueueTrack: (track, placement) => set((state) => ({
      queue: insertInQueue(state.queue, state.currentIndex, track, placement),
    })),

    playTrack: (track, queue, index) => {
      set({ queue, currentIndex: index, changeDirection: 'none' })
      playHowl(track)
    },

    playFromQueue: (index) => {
      const { queue, currentIndex } = get()
      if (index < 0 || index >= queue.length) return
      set({ currentIndex: index, changeDirection: index < currentIndex ? 'prev' : 'next' })
      playHowl(queue[index])
    },

    removeFromQueue: (index) => {
      const { queue, currentIndex } = get()
      if (index < 0 || index >= queue.length) return

      const newQueue = queue.filter((_, i) => i !== index)

      if (index === currentIndex) {
        // Удаляем играющий сейчас трек — переключаемся на следующий (тот же индекс
        // после удаления сдвигается на его место) либо останавливаем, если очередь пуста
        stopHowl()
        if (newQueue.length === 0) {
          set({ queue: [], currentIndex: -1, playing: false, seek: 0, progress: 0, duration: 0 })
        } else {
          const nextIdx = Math.min(index, newQueue.length - 1)
          set({ queue: newQueue, currentIndex: nextIdx, changeDirection: 'next' })
          playHowl(newQueue[nextIdx])
        }
      } else {
        const newIndex = index < currentIndex ? currentIndex - 1 : currentIndex
        set({ queue: newQueue, currentIndex: newIndex })
      }
    },

    clearQueue: () => {
      stopHowl()
      set({ queue: [], currentIndex: -1, playing: false, seek: 0, progress: 0, duration: 0, changeDirection: 'none' })
    },

    togglePlay: () => {
      if (!howl) {
        const { queue, currentIndex } = get()
        if (!queue.length) return
        const index = currentIndex >= 0 && currentIndex < queue.length ? currentIndex : 0
        set({ currentIndex: index })
        void playHowl(queue[index])
        return
      }
      if (howl.playing()) {
        howl.pause()
      } else {
        howl.play()
      }
    },

    playNext: () => {
      const { queue, currentIndex, shuffle, repeatMode } = get()
      if (!queue.length) return

      let nextIdx: number
      if (shuffle && queue.length > 1) {
        // Случайный следующий индекс, гарантированно отличный от текущего
        do {
          nextIdx = Math.floor(Math.random() * queue.length)
        } while (nextIdx === currentIndex)
      } else {
        const atEnd = currentIndex >= queue.length - 1
        if (atEnd && repeatMode === 'off') {
          // Конец очереди без повтора — просто останавливаемся на последнем треке
          stopHowl()
          set({ playing: false, seek: 0, progress: 0 })
          return
        }
        nextIdx = (currentIndex + 1) % queue.length
      }

      set({ currentIndex: nextIdx, changeDirection: 'next' })
      playHowl(queue[nextIdx])
    },

    playPrev: () => {
      const { queue, currentIndex, seek, shuffle } = get()
      if (!queue.length) return
      // If >3s in, restart current track
      if (seek > 3 && howl) {
        howl.seek(0)
        set({ seek: 0, progress: 0 })
        return
      }

      let prevIdx: number
      if (shuffle && queue.length > 1) {
        do {
          prevIdx = Math.floor(Math.random() * queue.length)
        } while (prevIdx === currentIndex)
      } else {
        prevIdx = (currentIndex - 1 + queue.length) % queue.length
      }

      set({ currentIndex: prevIdx, changeDirection: 'prev' })
      playHowl(queue[prevIdx])
    },

    seekTo: (ratio) => {
      if (!howl) return
      const dur = howl.duration() || 0
      const pos = ratio * dur
      howl.seek(pos)
      set({ seek: pos, progress: ratio })
    },

    setVolume: (v) => {
      const volume = Math.max(0, Math.min(1, v))
      set({ volume })
      useSettingsStore.getState().setMasterVolume(volume)
      howl?.volume(volume)
    },

    toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

    cycleRepeatMode: () => {
      const order: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
      const current = get().repeatMode
      const nextIdx = (order.indexOf(current) + 1) % order.length
      set({ repeatMode: order[nextIdx] })
    },
  }
}, {
  name: 'mei-music-player',
  merge: (persisted, current) => {
    const saved = persisted as Partial<PlayerState>
    const queue = Array.isArray(saved.queue)
      ? saved.queue.filter((track) => track && typeof track.path === 'string').map(({ coverData: _coverData, ...track }) => track as Track)
      : []
    const currentIndex = typeof saved.currentIndex === 'number' && saved.currentIndex >= 0 && saved.currentIndex < queue.length
      ? saved.currentIndex : -1
    return {
      ...current,
      queue,
      currentIndex,
      shuffle: saved.shuffle === true,
      repeatMode: saved.repeatMode === 'one' || saved.repeatMode === 'all' ? saved.repeatMode : 'off',
      playing: false,
      seek: 0,
      progress: 0,
      duration: 0,
    }
  },
  partialize: (state) => ({
    queue: state.queue.map(({ coverData: _coverData, ...track }) => track),
    currentIndex: state.currentIndex,
    repeatMode: state.repeatMode,
    shuffle: state.shuffle,
  }),
}))
