import { useNavStore, type Page } from '@shared/stores/navStore'
import { useLangStore } from '@shared/stores/langStore'
import { useT } from '@shared/i18n'
import dodaiLogoUrl from '../../../assets/dodai-logo.svg'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconGenerate() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function IconWorkflows() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 6h4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7" />
    </svg>
  )
}

function IconModels() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function DodaiLogo() {
  return <img src={dodaiLogoUrl} width={28} height={28} alt="Dodai 3D" style={{ borderRadius: 6 }} />
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  id,
  label,
  icon,
  active,
  onClick,
}: {
  id: Page
  label: string
  icon: JSX.Element
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-3 w-full px-3 py-[9px] rounded-xl text-[12.5px] font-medium transition-all duration-200 text-left group overflow-hidden"
      style={active ? {
        background: 'linear-gradient(135deg, rgba(139,92,246,0.16) 0%, rgba(59,130,246,0.08) 100%)',
        border: '1px solid rgba(139,92,246,0.18)',
        color: '#fff',
        boxShadow: 'inset 0 1px 0 rgba(196,181,253,0.06), 0 2px 12px rgba(139,92,246,0.12)',
      } : {
        background: 'transparent',
        border: '1px solid transparent',
        color: '',
      }}
    >
      {/* Active indicator line */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r-full"
          style={{
            height: '55%',
            background: 'linear-gradient(180deg, #c4b5fd, #60a5fa)',
            boxShadow: '0 0 12px rgba(139,92,246,0.9), 0 0 4px rgba(139,92,246,0.5)',
          }}
        />
      )}

      {/* Icon wrapper with hover glow */}
      <span
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200"
        style={active ? {
          background: 'rgba(139,92,246,0.18)',
          color: '#c4b5fd',
          boxShadow: '0 0 8px rgba(139,92,246,0.3)',
        } : {
          color: '',
        }}
      >
        {icon}
      </span>

      <span className={active ? 'text-white font-semibold' : 'text-zinc-500 group-hover:text-zinc-200 transition-colors'}>
        {label}
      </span>
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar(): JSX.Element {
  const { currentPage, navigate } = useNavStore()
  const { lang, setLang } = useLangStore()
  const t = useT()

  const NAV_MAIN: { id: Page; icon: JSX.Element }[] = [
    { id: 'dashboard', icon: <IconDashboard /> },
    { id: 'generate',  icon: <IconGenerate />  },
    { id: 'workflows', icon: <IconWorkflows /> },
    { id: 'models',    icon: <IconModels />    },
  ]

  const NAV_BOTTOM: { id: Page; icon: JSX.Element }[] = [
    { id: 'settings', icon: <IconSettings /> },
  ]

  return (
    <aside
      className="flex flex-col shrink-0 glass-panel"
      style={{
        width: 196,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.02), 4px 0 24px rgba(0,0,0,0.2)',
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 drag-region">
        <div
          className="no-drag shrink-0"
          style={{ filter: 'drop-shadow(0 0 14px rgba(139,92,246,0.5)) drop-shadow(0 0 4px rgba(59,130,246,0.3))' }}
        >
          <DodaiLogo />
        </div>
        <div className="no-drag leading-none">
          <p className="text-[14px] font-bold tracking-tight gradient-text">Dodai 3D</p>
          <p className="text-[9px] mt-[3px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(139,92,246,0.4)' }}>
            AI Platform
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-3 mb-3 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
      />

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV_MAIN.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            label={t.nav[item.id]}
            icon={item.icon}
            active={currentPage === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 px-2 pb-4">
        <div
          className="mx-1 mb-2 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
        />
        {NAV_BOTTOM.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            label={t.nav[item.id]}
            icon={item.icon}
            active={currentPage === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}

        {/* Version + language toggle */}
        <div className="flex items-center justify-between px-3 pt-2">
          <p className="text-[10px] text-zinc-700">v0.3.3</p>
          <button
            onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
            className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded transition-all"
            style={{
              color: '#52525b',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.3)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#52525b'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'
            }}
            title={lang === 'en' ? 'Switch to French' : 'Passer en anglais'}
          >
            {lang}
          </button>
        </div>
      </div>
    </aside>
  )
}
