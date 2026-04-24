import { useNavStore, type Page } from '@shared/stores/navStore'
import { useLangStore } from '@shared/stores/langStore'
import { useT } from '@shared/i18n'

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
  return (
    <svg width="28" height="28" viewBox="0 0 609 609" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dlg-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#c4b5fd" />
          <stop offset="50%"  stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <g transform="translate(0,609) scale(0.1,-0.1)" fill="url(#dlg-sidebar)" stroke="none">
        <path d="M2964 5671 c-20 -9 -918 -521 -1604 -914 -173 -100 -362 -207 -420 -239 -58 -32 -118 -73 -133 -91 -58 -67 -57 -45 -57 -1067 0 -831 2 -938 16 -958 l15 -22 758 0 c417 0 761 3 764 6 12 13 -26 67 -283 399 -64 83 -120 156 -124 163 -5 7 4 32 22 60 16 26 238 396 493 822 254 426 569 951 699 1165 308 506 305 502 290 520 -7 8 -72 48 -144 87 -124 69 -135 73 -201 75 -38 2 -79 -1 -91 -6z"/>
        <path d="M3683 5328 c-18 -23 -833 -1306 -833 -1312 0 -12 83 -15 485 -21 230 -3 420 -7 421 -8 4 -5 451 -755 657 -1102 438 -739 668 -1120 691 -1143 l23 -24 71 36 c91 46 139 88 152 134 14 50 14 2403 0 2453 -20 72 -48 98 -215 193 -766 440 -1414 806 -1427 806 -9 0 -20 -6 -25 -12z"/>
        <path d="M4037 2838 c-25 -33 -443 -702 -467 -747 l-12 -24 -1384 4 c-1247 4 -1385 2 -1399 -12 -44 -44 -21 -170 42 -231 21 -20 203 -132 408 -249 385 -220 1034 -594 1310 -754 88 -51 183 -105 210 -121 28 -15 88 -49 134 -76 158 -90 177 -86 475 84 127 72 416 236 641 363 226 128 507 287 625 354 212 121 250 145 250 163 0 5 -40 73 -88 151 -49 78 -177 286 -284 462 -393 643 -407 664 -430 665 -4 0 -18 -15 -31 -32z"/>
      </g>
    </svg>
  )
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
      className="relative flex items-center gap-3 w-full px-3 py-[9px] rounded-xl text-[12.5px] font-medium transition-all duration-150 text-left group"
      style={active ? {
        background: 'linear-gradient(135deg, rgba(139,92,246,0.13) 0%, rgba(59,130,246,0.07) 100%)',
        border: '1px solid rgba(139,92,246,0.14)',
        color: '#fff',
      } : {
        background: 'transparent',
        border: '1px solid transparent',
        color: '',
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r-full"
          style={{
            height: '55%',
            background: 'linear-gradient(180deg, #c4b5fd, #60a5fa)',
            boxShadow: '0 0 10px rgba(139,92,246,0.8)',
          }}
        />
      )}
      <span
        className="shrink-0 transition-colors"
        style={{ color: active ? '#a78bfa' : '' }}
      >
        {icon}
      </span>
      <span className={active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-200 transition-colors'}>
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
      className="flex flex-col shrink-0"
      style={{
        width: 196,
        background: 'linear-gradient(180deg, #0b0b0e 0%, #09090b 60%)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 drag-region">
        <div className="no-drag shrink-0" style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.4))' }}>
          <DodaiLogo />
        </div>
        <div className="no-drag">
          <p className="text-[14px] font-bold tracking-tight gradient-text leading-none">Dodai 3D</p>
          <p className="text-[9px] text-zinc-700 mt-0.5 uppercase tracking-widest font-semibold">AI Platform</p>
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
