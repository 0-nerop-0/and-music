import { useState } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { useTranslation } from '../../lib/i18n'

export default function TitleBar() {
  const t = useTranslation()
  const [hovered, setHovered] = useState<'min' | 'max' | 'close' | null>(null)

  const handleMinimize = () => window.api?.windowMinimize()
  const handleMaximize = () => window.api?.windowMaximize()
  const handleClose = () => window.api?.windowClose()

  return (
    <div
      className="h-9 flex items-center select-none shrink-0"
      style={{
        WebkitAppRegion: 'drag',
        background: 'var(--wallpaper-panel, rgba(28, 27, 31, 0.95))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      } as React.CSSProperties}
    >
      {/* Window buttons — no-drag zone */}
      <div
        className="flex items-center gap-1.5 px-3 h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          onMouseEnter={() => setHovered('close')}
          onMouseLeave={() => setHovered(null)}
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
          style={{ background: '#ff5f57' }}
          title={t('Закрыть', 'Close')}
          aria-label={t('Закрыть окно', 'Close window')}
        >
          {hovered === 'close' && <X size={8} strokeWidth={3} className="text-red-900" />}
        </button>

        {/* Minimize */}
        <button
          onClick={handleMinimize}
          onMouseEnter={() => setHovered('min')}
          onMouseLeave={() => setHovered(null)}
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
          style={{ background: '#febc2e' }}
          title={t('Свернуть', 'Minimize')}
          aria-label={t('Свернуть окно', 'Minimize window')}
        >
          {hovered === 'min' && <Minus size={8} strokeWidth={3} className="text-yellow-900" />}
        </button>

        {/* Maximize */}
        <button
          onClick={handleMaximize}
          onMouseEnter={() => setHovered('max')}
          onMouseLeave={() => setHovered(null)}
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all"
          style={{ background: '#28c840' }}
          title={t('Развернуть', 'Maximize')}
          aria-label={t('Развернуть окно', 'Maximize window')}
        >
          {hovered === 'max' && <Square size={7} strokeWidth={3} className="text-green-900" />}
        </button>
      </div>

      {/* Title */}
      <div className="flex-1 text-center text-xs font-medium text-white/50 pointer-events-none">
        (&) Music
      </div>

      {/* Right spacer (equals left width so title is centered) */}
      <div className="w-[72px]" />
    </div>
  )
}
