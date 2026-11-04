import { ReactNode, useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import BottomPlayer from '../player/BottomPlayer'
import { useThemeStore } from '../../stores/themeStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { sampleWallpaper, type WallpaperPalette } from '../../lib/wallpaper'
import { useLibraryStore } from '../../stores/libraryStore'
import { usePlayerStore } from '../../stores/playerStore'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  // Подписываемся на реальные значения, а не на функции-геттеры (getTheme/getWallpaper
  // стабильны между рендерами, поэтому Zustand не считал их "изменившимися" и не
  // ре-рендерил layout при смене темы/обоев — только слайдер прозрачности случайно
  // триггерил обновление, потому что сам был примитивным значением).
  const themeId = useThemeStore((s) => s.themeId)
  const wallpaperId = useThemeStore((s) => s.wallpaperId)
  const customWallpaperData = useThemeStore((s) => s.customWallpaperData)
  const customAccent = useThemeStore((s) => s.customAccent)
  const customTextColor = useThemeStore((s) => s.customTextColor)
  const customFontFamily = useThemeStore((s) => s.customFontFamily)
  const wallpaperOpacity = useThemeStore((s) => s.wallpaperOpacity)
  const wallpaperFit = useThemeStore((s) => s.wallpaperFit)
  const motionMode = useSettingsStore((s) => s.motionMode)
  const language = useSettingsStore((s) => s.language)
  const getTheme = useThemeStore((s) => s.getTheme)
  const getWallpaper = useThemeStore((s) => s.getWallpaper)
  const [palette, setPalette] = useState<WallpaperPalette | null>(null)

  useEffect(() => {
    document.documentElement.dataset.motion = motionMode
    document.documentElement.lang = language
  }, [motionMode, language])

  useEffect(() => {
    const unsubscribe = window.api.onFolderUpdated(({ folder, tracks }) => {
      useLibraryStore.getState().updateFolder(folder, tracks)
    })
    void window.api.watchFolders(useLibraryStore.getState().folders).catch((error) => {
      console.error('Could not watch music folders:', error)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (customWallpaperData?.startsWith('file:')) {
      void window.api.resolveWallpaperUrl(customWallpaperData).then((url) => {
        if (url && useThemeStore.getState().customWallpaperData === customWallpaperData) {
          useThemeStore.getState().setCustomWallpaper(url, useThemeStore.getState().customWallpaperName ?? undefined)
        }
      })
    }
  }, [customWallpaperData])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')) return
      if (event.altKey || event.shiftKey) return
      const player = usePlayerStore.getState()
      if (event.code === 'Space' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        player.togglePlay()
      } else if ((event.ctrlKey || event.metaKey) && event.code === 'ArrowRight') {
        event.preventDefault()
        player.playNext()
      } else if ((event.ctrlKey || event.metaKey) && event.code === 'ArrowLeft') {
        event.preventDefault()
        player.playPrev()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (wallpaperId !== 'custom' || !customWallpaperData) {
      setPalette(null)
      return
    }

    setPalette(null)
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (!cancelled) setPalette(sampleWallpaper(image))
    }
    image.onerror = () => {
      if (!cancelled) setPalette(null)
    }
    image.src = customWallpaperData
    return () => { cancelled = true }
  }, [wallpaperId, customWallpaperData])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const theme = getTheme()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wallpaper = getWallpaper()
  const isImageWallpaper = wallpaper.id === 'custom'
  const isLight = theme.id === 'light' && !isImageWallpaper
  const textAlphas = [30, 35, 40, 45, 50, 55, 60, 70, 75, 80, 90]
  const textVars = Object.fromEntries(textAlphas.map((value) => [
    `--text-${value}`,
    isLight ? `rgba(29, 25, 37, ${Math.max(0.68, value / 100)})` : `rgba(255, 255, 255, ${value / 100})`,
  ]))

  const bgStyle = {
    background: theme.background,
    color: customTextColor || (isLight ? '#211e29' : 'white'),
    fontFamily: customFontFamily || undefined,
    position: 'relative',
    '--app-accent': theme.accent,
    '--app-text': isLight ? '#211e29' : '#ffffff',
    '--settings-panel': isLight ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.035)',
    ...textVars,
    ...(isImageWallpaper ? {
      '--wallpaper-panel': palette?.panel ?? 'rgba(20, 18, 28, 0.88)',
      '--wallpaper-edge': palette?.edge ?? 'rgb(28, 25, 38)',
    } as React.CSSProperties : {}),
  } as React.CSSProperties

  return (
    <div className="flex flex-col h-screen overflow-hidden" data-theme={isLight ? 'light' : 'dark'} style={bgStyle}>
      {/* Wallpaper overlay */}
      {wallpaper.value && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={
            isImageWallpaper
              ? {
                  backgroundImage: wallpaper.value,
                  backgroundColor: wallpaperFit === 'auto' ? 'var(--wallpaper-edge)' : undefined,
                  backgroundSize: wallpaperFit === 'auto' ? 'contain' : wallpaperFit === 'stretch' ? '100% 100%' : wallpaperFit === 'tile' ? 'auto' : wallpaperFit,
                  backgroundPosition: 'center',
                  backgroundRepeat: wallpaperFit === 'tile' ? 'repeat' : 'no-repeat',
                  opacity: wallpaperOpacity,
                }
              : {
                  background: wallpaper.value,
                  opacity: wallpaperOpacity,
                }
          }
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <TitleBar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-h-0 overflow-y-auto p-6" style={isImageWallpaper ? { background: 'rgba(9, 10, 17, 0.62)' } : undefined}>
            {children}
          </main>
        </div>
        <BottomPlayer />
      </div>
    </div>
  )
}
