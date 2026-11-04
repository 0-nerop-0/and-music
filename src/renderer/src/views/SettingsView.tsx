import { useEffect, useRef, useState } from 'react'
import { useThemeStore, THEMES, WALLPAPERS, FONT_OPTIONS } from '../stores/themeStore'
import { useSettingsStore, LANGUAGES } from '../stores/settingsStore'
import { usePlayerStore } from '../stores/playerStore'
import { useTranslation } from '../lib/i18n'
import { Upload, Loader2, Download, FileJson, Palette, Globe, Info, Check, MessageCircle, Volume2, VolumeX, Sparkles } from 'lucide-react'

type SettingsSection = 'appearance' | 'sound' | 'motion' | 'language' | 'discord' | 'about'

const THEME_LABELS: Record<string, [string, string]> = {
  'dark-violet': ['Тёмный фиолетовый', 'Dark violet'],
  'midnight-blue': ['Полночный синий', 'Midnight blue'],
  forest: ['Лесной', 'Forest'],
  sunset: ['Закат', 'Sunset'],
  ocean: ['Океан', 'Ocean'],
  rose: ['Розовый', 'Rose'],
  light: ['Светлый', 'Light'],
}

const WALLPAPER_LABELS: Record<string, [string, string]> = {
  none: ['Без обоев', 'No wallpaper'],
  aurora: ['Аврора', 'Aurora'],
  neon: ['Неон', 'Neon'],
  cosmos: ['Космос', 'Cosmos'],
}

export default function SettingsView() {
  const [section, setSection] = useState<SettingsSection>('appearance')
  const t = useTranslation()

  const sections: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
    { id: 'appearance', label: t('Оформление', 'Appearance'), icon: Palette },
    { id: 'sound', label: t('Звук', 'Sound'), icon: Volume2 },
    { id: 'motion', label: t('Анимация', 'Animation'), icon: Sparkles },
    { id: 'language', label: t('Язык', 'Language'), icon: Globe },
    { id: 'discord', label: 'Discord', icon: MessageCircle },
    { id: 'about', label: t('О программе', 'About'), icon: Info },
  ]

  const descriptions: Record<SettingsSection, string> = {
    appearance: t('Подберите тему, шрифт и фон под вашу музыку.', 'Choose a theme, font and background for your music.'),
    sound: t('Громкость и плавность смены треков.', 'Volume and smooth transitions between tracks.'),
    motion: t('Управляйте движением элементов интерфейса.', 'Control motion across the interface.'),
    language: t('Выберите язык приложения.', 'Choose the app language.'),
    discord: t('Показывайте музыку в профиле Discord.', 'Show your music on your Discord profile.'),
    about: t('Информация о приложении.', 'Information about the app.'),
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full min-h-0">
      {/* Settings sub-navigation */}
      <nav aria-label={t('Разделы настроек', 'Settings sections')} className="lg:w-52 flex lg:flex-col gap-1 shrink-0 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
        {sections.map((s) => {
          const active = s.id === section
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0"
              style={{
                background: active ? 'rgba(208,188,255,0.15)' : 'transparent',
                color: active ? 'var(--app-accent)' : 'var(--text-60)',
              }}
            >
              <s.icon size={18} />
              {s.label}
            </button>
          )
        })}
      </nav>

      {/* Section content */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl px-5 py-5 lg:px-7 lg:py-6" style={{ background: 'var(--settings-panel)', border: '1px solid rgba(128,118,146,0.18)' }}>
        <div className="mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-55)' }}>{t('Настройки', 'Settings')}</p>
          <h1 className="text-2xl font-bold">{sections.find((item) => item.id === section)?.label}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-60)' }}>{descriptions[section]}</p>
        </div>
        <div className="settings-panel" key={section}>
          {section === 'appearance' && <AppearanceSection />}
          {section === 'sound' && <SoundSection />}
          {section === 'motion' && <MotionSection />}
          {section === 'language' && <LanguageSection />}
          {section === 'discord' && <DiscordSection />}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  )
}

function AppearanceSection() {
  const t = useTranslation()
  const language = useSettingsStore((state) => state.language)
  const {
    themeId,
    wallpaperId,
    customWallpaperData,
    customWallpaperName,
    wallpaperOpacity,
    wallpaperFit,
    customAccent,
    customTextColor,
    customFontFamily,
    setTheme,
    setWallpaper,
    setCustomWallpaper,
    setWallpaperOpacity,
    setWallpaperFit,
    setCustomAccent,
    setCustomTextColor,
    setCustomFontFamily,
    exportThemeJson,
    importThemeJson,
  } = useThemeStore()

  const [uploadingWallpaper, setUploadingWallpaper] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickWallpaper = async () => {
    setUploadError(null)
    setUploadingWallpaper(true)
    try {
      const picked = await window.api.pickWallpaper()
      if (picked.cancelled) return
      if (!picked.fileUrl) {
        setUploadError(picked.error === 'unsupported-format'
          ? t('Выберите JPG, PNG, WebP, AVIF или GIF.', 'Choose a JPG, PNG, WebP, AVIF or GIF.')
          : t('Не удалось сохранить изображение. Проверьте доступ к диску.', 'Could not save the image. Check disk access.'))
        return
      }
      setCustomWallpaper(picked.fileUrl, picked.fileName)
      setWallpaperFit('auto')
    } catch (err) {
      console.error('pick wallpaper error', err)
      setUploadError(t('Ошибка при выборе файла', 'Could not select the file'))
    } finally {
      setUploadingWallpaper(false)
    }
  }

  const handleExport = () => {
    const json = exportThemeJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'and-music-theme.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportError(null)
    setImportSuccess(false)
    try {
      const text = await file.text()
      const result = importThemeJson(text)
      if (!result.ok) {
        setImportError(language === 'en' ? 'Invalid theme file' : result.error ?? 'Не удалось импортировать тему')
        return
      }
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 2500)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('Не удалось прочитать файл', 'Could not read the file'))
    }
  }

  const activeFontValue = customFontFamily ?? FONT_OPTIONS[0].value
  const currentTheme = THEMES.find((theme) => theme.id === themeId) ?? THEMES[0]
  const activeWallpaper = WALLPAPERS.find((wallpaper) => wallpaper.id === wallpaperId)
  const customIsGif = Boolean(customWallpaperName?.toLowerCase().endsWith('.gif') || customWallpaperData?.startsWith('data:image/gif') || /\.gif(?:$|\?)/i.test(customWallpaperData ?? ''))
  const fitOptions = [
    { id: 'auto' as const, ru: 'Под окно', en: 'Fit window' },
    { id: 'cover' as const, ru: 'Заполнить', en: 'Fill' },
    { id: 'contain' as const, ru: 'Вместить', en: 'Fit' },
    { id: 'stretch' as const, ru: 'Растянуть', en: 'Stretch' },
    { id: 'tile' as const, ru: 'Плитка', en: 'Tile' },
  ]

  useEffect(() => {
    if (!customWallpaperData) return
    const image = new Image()
    image.onerror = () => setUploadError(language === 'en' ? 'Wallpaper file is unavailable. Choose an image again.' : 'Файл обоев недоступен. Выберите изображение ещё раз.')
    image.src = customWallpaperData
    return () => { image.onerror = null }
  }, [customWallpaperData, language])

  return (
    <div>
      {/* Themes */}
      <section className="mb-6">
        <h2 className="text-base font-semibold">{t('Цветовая тема', 'Color theme')}</h2>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-60)' }}>
          {t('Выберите основу оформления. Цвет акцента можно изменить ниже.', 'Choose a starting look. You can customize its accent below.')}
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {THEMES.map((theme) => {
            const active = theme.id === themeId
            const label = THEME_LABELS[theme.id]
            const previewText = theme.id === 'light' ? '#2a2436' : '#fff'
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                aria-pressed={active}
                className="relative rounded-xl overflow-hidden h-28 p-3 text-left transition-colors"
                style={{
                  background: theme.background,
                  border: active ? `2px solid ${theme.accent}` : '2px solid rgba(255,255,255,0.12)',
                  color: previewText,
                }}
              >
                <div className="flex gap-2 h-14 mb-2 rounded-md overflow-hidden" style={{ background: theme.surface }} aria-hidden="true">
                  <div className="w-7 shrink-0 p-1.5 flex flex-col gap-1" style={{ borderRight: '1px solid rgba(127,127,127,0.2)' }}>
                    <span className="h-1 rounded-full" style={{ background: theme.accent }} />
                    <span className="h-1 rounded-full bg-white/30" />
                    <span className="h-1 rounded-full bg-white/20" />
                  </div>
                  <div className="flex-1 p-2 flex flex-col gap-1.5">
                    <span className="w-3/5 h-1.5 rounded-full" style={{ background: previewText, opacity: 0.8 }} />
                    <span className="w-4/5 h-1 rounded-full" style={{ background: previewText, opacity: 0.35 }} />
                    <span className="w-2/5 h-1 rounded-full" style={{ background: theme.accent }} />
                  </div>
                </div>
                <span className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="truncate">{label ? t(label[0], label[1]) : theme.name}</span>
                  {active && <Check size={15} className="shrink-0" />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Custom accent + text colors */}
      <section className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-40)' }}>
            {t('Акцентный цвет', 'Accent color')}
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customAccent ?? THEMES.find((t) => t.id === themeId)?.accent ?? '#d0bcff'}
              onChange={(e) => setCustomAccent(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}
              title={t('Свой акцентный цвет', 'Custom accent color')}
              aria-label={t('Акцентный цвет', 'Accent color')}
            />
            <span className="text-sm min-w-0 truncate" style={{ color: 'var(--text-60)' }}>
              {customAccent ? customAccent : t('По умолчанию', 'Default')}
            </span>
            {customAccent && (
              <button
                onClick={() => setCustomAccent(null)}
                className="text-xs px-2 py-1 rounded-md player-btn shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {t('Сбросить', 'Reset')}
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-40)' }}>
            {t('Цвет текста', 'Text color')}
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customTextColor ?? '#ffffff'}
              onChange={(e) => setCustomTextColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}
              title={t('Свой цвет основного текста', 'Custom text color')}
              aria-label={t('Цвет текста', 'Text color')}
            />
            <span className="text-sm min-w-0 truncate" style={{ color: 'var(--text-60)' }}>
              {customTextColor ? customTextColor : t('По умолчанию (белый)', 'Default (white)')}
            </span>
            {customTextColor && (
              <button
                onClick={() => setCustomTextColor(null)}
                className="text-xs px-2 py-1 rounded-md player-btn shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {t('Сбросить', 'Reset')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Font family */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-40)' }}>
          {t('Шрифт', 'Font')}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {FONT_OPTIONS.map((font) => {
            const active = font.value === activeFontValue
            return (
              <button
                key={font.id}
                onClick={() => setCustomFontFamily(font.id === 'system' ? null : font.value)}
                className="rounded-xl px-3 py-2.5 text-left transition-all"
                style={{
                  background: active ? 'rgba(208,188,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: active ? '2px solid rgba(208,188,255,0.8)' : '2px solid transparent',
                  fontFamily: font.value,
                }}
              >
                <p className="text-sm">{font.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-40)' }}>Aa Бб 123</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Wallpapers */}
      <section className="mb-4">
        <h2 className="text-base font-semibold">{t('Обои', 'Wallpaper')}</h2>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-60)' }}>
          {t('Изображение или GIF подстраивается под размер окна; панели сохраняют читаемость.', 'Your image or GIF follows the window size while panels remain readable.')}
        </p>

        <div className="relative rounded-xl h-36 overflow-hidden mb-4" style={{ background: currentTheme.background, border: '1px solid rgba(255,255,255,0.1)' }}>
          {wallpaperId !== 'none' && (
            <div className="absolute inset-0" style={wallpaperId === 'custom' && customWallpaperData
              ? {
                  backgroundImage: `url("${customWallpaperData}")`,
                  backgroundColor: wallpaperFit === 'auto' ? 'var(--wallpaper-edge, #1c1926)' : undefined,
                  backgroundSize: wallpaperFit === 'auto' ? 'contain' : wallpaperFit === 'stretch' ? '100% 100%' : wallpaperFit === 'tile' ? 'auto' : wallpaperFit,
                  backgroundPosition: 'center',
                  backgroundRepeat: wallpaperFit === 'tile' ? 'repeat' : 'no-repeat',
                  opacity: wallpaperOpacity,
                }
              : { background: activeWallpaper?.value, opacity: wallpaperOpacity }}
            />
          )}
          <div className="absolute left-4 bottom-3 right-4 flex items-end justify-between gap-3" style={{ color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}>
            <div>
              <p className="text-xs opacity-75">{t('Предпросмотр', 'Preview')}</p>
              <p className="text-sm font-semibold truncate">{wallpaperId === 'custom' ? customWallpaperName || t('Свои обои', 'Custom wallpaper') : activeWallpaper ? t(...(WALLPAPER_LABELS[activeWallpaper.id] ?? [activeWallpaper.name, activeWallpaper.name])) : t('Без обоев', 'No wallpaper')}</p>
            </div>
            {customIsGif && wallpaperId === 'custom' && <span className="text-xs font-semibold px-2 py-1 rounded-md bg-black/40">GIF</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 mb-3">
          {WALLPAPERS.map((wallpaper) => {
            const active = wallpaper.id === wallpaperId
            const label = WALLPAPER_LABELS[wallpaper.id]
            return (
              <button
                key={wallpaper.id}
                type="button"
                onClick={() => setWallpaper(wallpaper.id)}
                aria-pressed={active}
                className="rounded-xl h-16 px-3 flex items-end justify-between text-left text-xs font-semibold transition-colors"
                style={{
                  background: wallpaper.value || 'rgba(255,255,255,0.05)',
                  border: active ? '2px solid #d0bcff' : '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}
              >
                <span className="pb-2">{label ? t(label[0], label[1]) : wallpaper.name}</span>
                {active && <Check size={14} className="mb-2 shrink-0" />}
              </button>
            )
          })}
          {customWallpaperData && (
            <button
              type="button"
              onClick={() => setWallpaper('custom')}
              aria-pressed={wallpaperId === 'custom'}
              className="rounded-xl h-16 px-3 flex items-end justify-between text-left text-xs font-semibold transition-colors overflow-hidden"
              style={{
                backgroundImage: `url("${customWallpaperData}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: wallpaperId === 'custom' ? '2px solid #d0bcff' : '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              <span className="pb-2 truncate">{t('Свои обои', 'Custom wallpaper')}</span>
              {wallpaperId === 'custom' && <Check size={14} className="mb-2 shrink-0" />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handlePickWallpaper}
          disabled={uploadingWallpaper}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: 'rgba(208,188,255,0.15)', color: 'var(--app-accent)' }}
        >
          {uploadingWallpaper ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {customWallpaperData ? t('Заменить файл', 'Replace file') : t('Выбрать изображение или GIF', 'Choose image or GIF')}
        </button>
        {uploadError && <p role="alert" className="text-sm mt-2" style={{ color: '#f48fb1' }}>{uploadError}</p>}

        {wallpaperId !== 'none' && (
          <div className="mt-6 space-y-5">
            {wallpaperId === 'custom' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t('Как разместить изображение', 'Image layout')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="group" aria-label={t('Режим размещения обоев', 'Wallpaper layout')}>
                  {fitOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setWallpaperFit(option.id)}
                      aria-pressed={wallpaperFit === option.id}
                      className="rounded-lg px-2 py-2.5 text-xs font-medium transition-colors"
                      style={{ background: wallpaperFit === option.id ? 'rgba(208,188,255,0.17)' : 'rgba(255,255,255,0.05)', border: wallpaperFit === option.id ? '1px solid #d0bcff' : '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {t(option.ru, option.en)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{t('Видимость обоев', 'Wallpaper visibility')}</h3>
                <span className="text-sm tabular-nums" style={{ color: 'var(--app-accent)' }}>{Math.round(wallpaperOpacity * 100)}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3" role="group" aria-label={t('Режим прозрачности обоев', 'Wallpaper opacity preset')}>
                {[
                  { value: 0.25, ru: 'Лёгкий', en: 'Subtle' },
                  { value: 0.6, ru: 'Обычный', en: 'Balanced' },
                  { value: 1, ru: 'Полный', en: 'Full' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setWallpaperOpacity(preset.value)}
                    aria-pressed={Math.round(wallpaperOpacity * 100) === preset.value * 100}
                    className="rounded-lg px-2 py-2 text-xs font-medium transition-colors"
                    style={{ background: Math.round(wallpaperOpacity * 100) === preset.value * 100 ? 'rgba(208,188,255,0.17)' : 'rgba(255,255,255,0.05)', border: Math.round(wallpaperOpacity * 100) === preset.value * 100 ? '1px solid #d0bcff' : '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {t(preset.ru, preset.en)} · {preset.value * 100}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(wallpaperOpacity * 100)}
                onChange={(event) => setWallpaperOpacity(Number(event.target.value) / 100)}
                aria-label={t('Видимость обоев', 'Wallpaper visibility')}
                className="app-slider"
                style={{ '--slider-progress': `${wallpaperOpacity * 100}%` } as React.CSSProperties}
              />
            </div>
          </div>
        )}
      </section>
      <section className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-base font-semibold">{t('Перенос оформления', 'Save or load appearance')}</h2>
        <p className="text-sm mt-1 mb-3" style={{ color: 'var(--text-60)' }}>
          {t('JSON сохраняет тему и режимы. Сам файл обоев в него не входит.', 'JSON saves theme and layout choices. The wallpaper file is not included.')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium player-btn"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            title={t('Экспортировать настройки оформления в JSON', 'Export appearance settings as JSON')}
          >
            <Download size={15} />
            {t('Экспорт JSON', 'Export JSON')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium player-btn"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            title={t('Импортировать настройки оформления из JSON', 'Import appearance settings from JSON')}
          >
            <FileJson size={15} />
            {t('Импорт JSON', 'Import JSON')}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
        </div>
        {importError && <p role="alert" className="text-sm mt-3" style={{ color: '#f48fb1' }}>{t('Ошибка импорта:', 'Import error:')} {importError}</p>}
        {importSuccess && <p role="status" className="text-sm mt-3" style={{ color: '#a5d6a7' }}>{t('Настройки оформления импортированы', 'Appearance settings imported')}</p>}
      </section>
    </div>
  )
}

function SoundSection() {
  const t = useTranslation()
  const volume = usePlayerStore((state) => state.volume)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const previousVolume = useRef(volume > 0 ? volume : 0.8)
  const fadeSeconds = useSettingsStore((state) => state.fadeSeconds)
  const setFadeSeconds = useSettingsStore((state) => state.setFadeSeconds)
  const fadeOptions = [0, 0.5, 1, 2]

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold">{t('Общая громкость', 'Master volume')}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-60)' }}>
              {t('Применяется сразу и сохраняется для следующего запуска.', 'Applies immediately and is saved for the next launch.')}
            </p>
          </div>
          <span className="text-xl font-semibold tabular-nums" style={{ color: 'var(--app-accent)' }}>{Math.round(volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (volume > 0) {
                previousVolume.current = volume
                setVolume(0)
              } else {
                setVolume(previousVolume.current)
              }
            }}
            aria-label={volume === 0 ? t('Включить звук', 'Unmute') : t('Выключить звук', 'Mute')}
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            {volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            aria-label={t('Общая громкость', 'Master volume')}
            className="app-slider"
            style={{ '--slider-progress': `${volume * 100}%` } as React.CSSProperties}
          />
        </div>
      </section>

      <section className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <h2 className="text-base font-semibold">{t('Плавный переход между треками', 'Smooth track transitions')}</h2>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-60)' }}>
          {t('При смене трека предыдущий затухает, а следующий набирает громкость.', 'When tracks change, the previous one fades out while the next fades in.')}
        </p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('Длительность перехода', 'Transition duration')}>
          {fadeOptions.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => setFadeSeconds(seconds)}
              aria-pressed={fadeSeconds === seconds}
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: fadeSeconds === seconds ? 'rgba(208,188,255,0.18)' : 'rgba(255,255,255,0.05)',
                color: fadeSeconds === seconds ? 'var(--app-accent)' : 'inherit',
                border: fadeSeconds === seconds ? '1px solid rgba(208,188,255,0.55)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {seconds === 0 ? t('Выкл.', 'Off') : `${seconds} ${t('с', 's')}`}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function MotionSection() {
  const t = useTranslation()
  const mode = useSettingsStore((state) => state.motionMode)
  const setMode = useSettingsStore((state) => state.setMotionMode)
  const options = [
    { id: 'system' as const, title: t('Как в системе', 'Follow system'), description: t('Учитывать системную настройку уменьшения движения.', 'Use the system reduced motion preference.') },
    { id: 'on' as const, title: t('Включены', 'On'), description: t('Показывать переходы и отклик элементов.', 'Show transitions and motion feedback.') },
    { id: 'off' as const, title: t('Выключены', 'Off'), description: t('Мгновенная смена состояний без движения.', 'Change states immediately without motion.') },
  ]

  return (
    <section className="max-w-2xl">
      <h2 className="text-base font-semibold mb-1">{t('Анимация интерфейса', 'Interface animation')}</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-60)' }}>
        {t('Выбранный режим применяется сразу ко всем экранам.', 'Your choice applies immediately across all screens.')}
      </p>
      <div className="grid gap-2" role="group" aria-label={t('Режим анимации', 'Animation mode')}>
        {options.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => setMode(option.id)}
            aria-pressed={mode === option.id}
            className="w-full rounded-xl p-4 text-left flex items-center justify-between gap-4 transition-colors"
            style={{
              background: mode === option.id ? 'rgba(208,188,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: mode === option.id ? '1px solid rgba(208,188,255,0.55)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span>
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--text-60)' }}>{option.description}</span>
            </span>
            <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ border: `2px solid ${mode === option.id ? '#d0bcff' : 'rgba(255,255,255,0.4)'}` }}>
              {mode === option.id && <span className="w-2 h-2 rounded-full" style={{ background: '#d0bcff' }} />}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function LanguageSection() {
  const t = useTranslation()
  const { language, setLanguage } = useSettingsStore()

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-40)' }}>
        {t('Язык интерфейса', 'Interface language')}
      </h3>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {LANGUAGES.map((lang) => {
          const active = lang.id === language
          return (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              aria-pressed={active}
              className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all"
              style={{
                background: active ? 'rgba(208,188,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: active ? '2px solid rgba(208,188,255,0.8)' : '2px solid transparent',
              }}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-sm">{lang.name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DiscordSection() {
  const t = useTranslation()
  const { discordEnabled, discordClientId, setDiscordEnabled, setDiscordClientId } = useSettingsStore()
  const [localClientId, setLocalClientId] = useState(discordClientId)

  const handleClientIdBlur = () => {
    setDiscordClientId(localClientId.trim())
  }

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-40)' }}>
        Discord Rich Presence
      </h3>

      <div className="rounded-xl p-4 max-w-md mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('Показывать трек в статусе Discord', 'Show the current track on Discord')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-45)' }}>
              {t('Отображает текущий трек, исполнителя и прогресс воспроизведения в вашем профиле Discord.', 'Displays the current track, artist and playback progress on your Discord profile.')}
            </p>
          </div>
          <button
            onClick={() => setDiscordEnabled(!discordEnabled)}
            role="switch"
            aria-checked={discordEnabled}
            aria-label={t('Показывать трек в Discord', 'Show track on Discord')}
            className="relative w-11 h-6 rounded-full transition-colors shrink-0"
            style={{ background: discordEnabled ? '#d0bcff' : 'rgba(255,255,255,0.15)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: discordEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      <div className="max-w-md">
        <label htmlFor="discord-client-id" className="text-sm font-medium block mb-1.5">Application (Client) ID</label>
        <input
          id="discord-client-id"
          type="text"
          value={localClientId}
          onChange={(e) => setLocalClientId(e.target.value)}
          onBlur={handleClientIdBlur}
          placeholder={t('Ваш Application ID из Discord Developer Portal', 'Your Application ID from the Discord Developer Portal')}
          disabled={!discordEnabled}
          className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-90)',
          }}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--text-35)' }}>
          {t('Создайте приложение на', 'Create an application at')}{' '}
          <span style={{ color: 'var(--app-accent)' }}>discord.com/developers/applications</span>{' '}
          {t('и вставьте сюда его Application ID. Без собственного ID Rich Presence работать не будет.', 'and paste its Application ID here. Rich Presence requires your own ID.')}
        </p>
      </div>
    </section>
  )
}

function AboutSection() {
  const t = useTranslation()
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-40)' }}>
        {t('О программе', 'About')}
      </h3>
      <div className="rounded-xl p-4 max-w-md" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="text-lg font-semibold">(&amp;) Music</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-50)' }}>{t('Версия 1.0.0', 'Version 1.0.0')}</p>
        <p className="text-sm mt-3" style={{ color: 'var(--text-50)' }}>
          {t('Локальный музыкальный плеер с поддержкой плейлистов, тем и обоев.', 'A local music player with playlists, themes and wallpapers.')}
        </p>
      </div>
      <div className="rounded-xl p-4 max-w-md mt-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="font-semibold mb-2">{t('Горячие клавиши', 'Keyboard shortcuts')}</p>
        <p className="text-sm" style={{ color: 'var(--text-60)' }}>{t('Пробел — пауза или воспроизведение', 'Space — pause or play')}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-60)' }}>{t('Ctrl + ← / → — предыдущий / следующий трек', 'Ctrl + ← / → — previous / next track')}</p>
      </div>
    </section>
  )
}
