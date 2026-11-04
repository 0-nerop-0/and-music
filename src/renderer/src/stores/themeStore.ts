import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Theme {
  id: string
  name: string
  /** CSS gradient or solid color for the background */
  background: string
  /** Primary accent color */
  accent: string
  /** Surface/panel color */
  surface: string
}

export const THEMES: Theme[] = [
  {
    id: 'dark-violet',
    name: 'Dark Violet',
    background: 'linear-gradient(135deg, #1c1b1f 0%, #2a1f3d 100%)',
    accent: '#d0bcff',
    surface: 'rgba(40,36,56,0.95)',
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1f3c 100%)',
    accent: '#90caf9',
    surface: 'rgba(22,28,52,0.95)',
  },
  {
    id: 'forest',
    name: 'Forest',
    background: 'linear-gradient(135deg, #0d1f0d 0%, #1a2e1a 100%)',
    accent: '#a5d6a7',
    surface: 'rgba(20,38,20,0.95)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    background: 'linear-gradient(135deg, #1f0d0d 0%, #3d1f2a 100%)',
    accent: '#ffab91',
    surface: 'rgba(42,22,30,0.95)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    background: 'linear-gradient(135deg, #0d1a2e 0%, #0d2a3d 100%)',
    accent: '#80deea',
    surface: 'rgba(16,36,54,0.95)',
  },
  {
    id: 'rose',
    name: 'Rose',
    background: 'linear-gradient(135deg, #1f0d18 0%, #3d1f32 100%)',
    accent: '#f48fb1',
    surface: 'rgba(40,20,36,0.95)',
  },
  {
    id: 'light',
    name: 'Light',
    background: 'linear-gradient(135deg, #f5f5f5 0%, #ede7f6 100%)',
    accent: '#7c4dff',
    surface: 'rgba(240,235,255,0.95)',
  },
]

export interface WallpaperOption {
  id: string
  name: string
  /** CSS background value */
  value: string
}

export type WallpaperFit = 'auto' | 'cover' | 'contain' | 'stretch' | 'tile'

export const WALLPAPERS: WallpaperOption[] = [
  { id: 'none', name: 'None', value: '' },
  {
    id: 'aurora',
    name: 'Aurora',
    value:
      'radial-gradient(ellipse at 20% 50%, rgba(120,40,200,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,180,255,0.2) 0%, transparent 60%), radial-gradient(ellipse at 60% 80%, rgba(0,200,120,0.15) 0%, transparent 60%)',
  },
  {
    id: 'neon',
    name: 'Neon',
    value:
      'radial-gradient(ellipse at 10% 90%, rgba(255,0,128,0.25) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(0,255,200,0.2) 0%, transparent 50%)',
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    value:
      'radial-gradient(ellipse at 50% 50%, rgba(60,0,120,0.4) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(0,0,80,0.3) 0%, transparent 50%)',
  },
]

export const FONT_OPTIONS: { id: string; name: string; value: string }[] = [
  {
    id: 'system',
    name: 'System UI',
    value:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  },
  { id: 'inter', name: 'Inter', value: "'Inter', 'Segoe UI', sans-serif" },
  { id: 'roboto', name: 'Roboto', value: "'Roboto', 'Segoe UI', sans-serif" },
  { id: 'poppins', name: 'Poppins', value: "'Poppins', 'Segoe UI', sans-serif" },
  { id: 'mono', name: 'Monospace', value: "'JetBrains Mono', 'Consolas', monospace" },
  { id: 'serif', name: 'Serif', value: "'Georgia', 'Times New Roman', serif" },
]

interface ThemeState {
  themeId: string
  wallpaperId: string
  /** URL файла в данных приложения; старые data URL также поддерживаются */
  customWallpaperData: string | null
  customWallpaperName: string | null
  /** Насколько заметны обои/оверлей (0..1) */
  wallpaperOpacity: number
  wallpaperFit: WallpaperFit
  /** Пользовательский акцентный цвет, перекрывает accent выбранной темы, если задан */
  customAccent: string | null
  /** Пользовательский цвет основного текста, перекрывает стандартный white, если задан */
  customTextColor: string | null
  /** Пользовательский шрифт (CSS font-family), перекрывает системный, если задан */
  customFontFamily: string | null

  setTheme: (id: string) => void
  setWallpaper: (id: string) => void
  setCustomWallpaper: (url: string | null, name?: string) => void
  setWallpaperOpacity: (v: number) => void
  setWallpaperFit: (fit: WallpaperFit) => void
  setCustomAccent: (color: string | null) => void
  setCustomTextColor: (color: string | null) => void
  setCustomFontFamily: (font: string | null) => void
  getTheme: () => Theme
  getWallpaper: () => WallpaperOption
  /** Экспорт всех настроек оформления в JSON-строку (для сохранения/переноса) */
  exportThemeJson: () => string
  /** Импорт настроек оформления из JSON-строки, полученной через exportThemeJson */
  importThemeJson: (json: string) => { ok: boolean; error?: string }
}

const EXPORTABLE_KEYS = [
  'themeId',
  'wallpaperId',
  'wallpaperOpacity',
  'wallpaperFit',
  'customAccent',
  'customTextColor',
  'customFontFamily',
] as const

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: 'dark-violet',
      wallpaperId: 'none',
      customWallpaperData: null,
      customWallpaperName: null,
      wallpaperOpacity: 0.6,
      wallpaperFit: 'auto',
      customAccent: null,
      customTextColor: null,
      customFontFamily: null,

      setTheme: (id) => set({ themeId: id }),
      setWallpaper: (id) => set({ wallpaperId: id }),
      setCustomWallpaper: (url, name) =>
        set({ customWallpaperData: url, customWallpaperName: url ? name ?? null : null, wallpaperId: url ? 'custom' : 'none' }),
      setWallpaperOpacity: (v) => set({ wallpaperOpacity: Math.max(0, Math.min(1, v)) }),
      setWallpaperFit: (wallpaperFit) => set({ wallpaperFit }),
      setCustomAccent: (color) => set({ customAccent: color }),
      setCustomTextColor: (color) => set({ customTextColor: color }),
      setCustomFontFamily: (font) => set({ customFontFamily: font }),

      getTheme: () => {
        const base = THEMES.find((t) => t.id === get().themeId) ?? THEMES[0]
        const customAccent = get().customAccent
        return customAccent ? { ...base, accent: customAccent } : base
      },
      getWallpaper: () => {
        if (get().wallpaperId === 'custom' && get().customWallpaperData) {
          return { id: 'custom', name: 'Custom', value: `url("${get().customWallpaperData}")` }
        }
        return WALLPAPERS.find((w) => w.id === get().wallpaperId) ?? WALLPAPERS[0]
      },

      exportThemeJson: () => {
        const state = get()
        const payload: Record<string, unknown> = { version: 2 }
        for (const key of EXPORTABLE_KEYS) payload[key] = state[key]
        // A local file URL only works on this computer. Keep image bytes out of
        // the small, portable appearance preset; older v1 imports still work.
        if (payload.wallpaperId === 'custom') payload.wallpaperId = 'none'
        return JSON.stringify(payload, null, 2)
      },

      importThemeJson: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (typeof parsed !== 'object' || parsed === null) {
            return { ok: false, error: 'Некорректный формат файла' }
          }

          const next: Partial<ThemeState> = {}
          if (typeof parsed.themeId === 'string') next.themeId = parsed.themeId
          if (typeof parsed.wallpaperId === 'string') next.wallpaperId = parsed.wallpaperId
          if (typeof parsed.customWallpaperData === 'string' || parsed.customWallpaperData === null) {
            next.customWallpaperData = parsed.customWallpaperData
          }
          if (typeof parsed.customWallpaperName === 'string' || parsed.customWallpaperName === null) {
            next.customWallpaperName = parsed.customWallpaperName
          }
          if (typeof parsed.wallpaperOpacity === 'number') {
            next.wallpaperOpacity = Math.max(0, Math.min(1, parsed.wallpaperOpacity))
          }
          if (['auto', 'cover', 'contain', 'stretch', 'tile'].includes(parsed.wallpaperFit)) {
            next.wallpaperFit = parsed.wallpaperFit
          }
          if (typeof parsed.customAccent === 'string' || parsed.customAccent === null) {
            next.customAccent = parsed.customAccent
          }
          if (typeof parsed.customTextColor === 'string' || parsed.customTextColor === null) {
            next.customTextColor = parsed.customTextColor
          }
          if (typeof parsed.customFontFamily === 'string' || parsed.customFontFamily === null) {
            next.customFontFamily = parsed.customFontFamily
          }

          set(next)
          return { ok: true }
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) }
        }
      },
    }),
    {
      name: 'mei-music-theme',
      version: 1,
      migrate: (persistedState, version) => ({
        ...(persistedState as object),
        wallpaperFit: version < 1 ? 'auto' : (persistedState as ThemeState).wallpaperFit,
      }),
    }
  )
)
