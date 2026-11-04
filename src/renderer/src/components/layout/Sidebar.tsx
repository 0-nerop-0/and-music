import { NavLink } from 'react-router-dom'
import { Music2, ListMusic, Clock, Settings } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { useTranslation } from '../../lib/i18n'

export default function Sidebar() {
  const theme = useThemeStore((s) => s.getTheme())
  const t = useTranslation()

  const navItems = [
    { path: '/library', icon: Music2, label: t('Библиотека', 'Library') },
    { path: '/playlists', icon: ListMusic, label: t('Плейлисты', 'Playlists') },
    { path: '/queue', icon: Clock, label: t('Очередь', 'Queue') },
  ]

  return (
    <aside
      className="w-56 flex flex-col gap-2 p-3 shrink-0"
      style={{ background: `var(--wallpaper-panel, ${theme.surface})`, borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Logo */}
      <div className="px-3 py-2 mb-1">
        <h1 className="text-xl font-bold" style={{ color: theme.accent }}>
          (&) Music
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'active-nav' : 'hover-nav'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: theme.accent + '22', color: theme.accent }
                : { color: 'var(--text-60)' }
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full ${
              isActive ? 'active-nav' : 'hover-nav'
            }`
          }
          style={({ isActive }) =>
            isActive
              ? { background: theme.accent + '22', color: theme.accent }
              : { color: 'var(--text-60)' }
          }
        >
          <Settings size={18} />
          {t('Настройки', 'Settings')}
        </NavLink>
      </div>
    </aside>
  )
}
