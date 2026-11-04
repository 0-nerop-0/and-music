import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'ru' | 'en'
export type MotionMode = 'system' | 'on' | 'off'

export const LANGUAGES: { id: Language; name: string; flag: string }[] = [
  { id: 'ru', name: 'Русский', flag: '🇷🇺' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
]

interface SettingsState {
  language: Language
  setLanguage: (lang: Language) => void
  motionMode: MotionMode
  setMotionMode: (mode: MotionMode) => void
  masterVolume: number
  setMasterVolume: (volume: number) => void
  fadeSeconds: number
  setFadeSeconds: (seconds: number) => void

  // Discord Rich Presence
  discordEnabled: boolean
  discordClientId: string
  setDiscordEnabled: (enabled: boolean) => void
  setDiscordClientId: (clientId: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      setLanguage: (lang) => set({ language: lang }),
      motionMode: 'system',
      setMotionMode: (motionMode) => set({ motionMode }),
      masterVolume: 0.8,
      setMasterVolume: (masterVolume) => set({ masterVolume: Math.max(0, Math.min(1, masterVolume)) }),
      fadeSeconds: 0,
      setFadeSeconds: (fadeSeconds) => set({ fadeSeconds: Math.max(0, Math.min(3, fadeSeconds)) }),

      discordEnabled: true,
      discordClientId: '',
      setDiscordEnabled: (enabled) => set({ discordEnabled: enabled }),
      setDiscordClientId: (clientId) => set({ discordClientId: clientId }),
    }),
    { name: 'and-music-settings' }
  )
)
