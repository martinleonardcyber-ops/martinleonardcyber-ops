import { useEffect, useState } from 'react'
import { useAppStore, SetupProgress } from '@shared/stores/appStore'
import { useT } from '@shared/i18n'

// ─── Logo ──────────────────────────────────────────────────────────────────

function DodaiLogo(): JSX.Element {
  return (
    <div className="mb-8 flex flex-col items-center">
      <div style={{ filter: 'drop-shadow(0 0 24px rgba(139,92,246,0.5))' }}>
        <svg width="64" height="64" viewBox="0 0 609 609" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dlg-splash" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#c084fc"/>
              <stop offset="45%"  stopColor="#8b5cf6"/>
              <stop offset="100%" stopColor="#3b82f6"/>
            </linearGradient>
          </defs>
          <g transform="translate(0,609) scale(0.1,-0.1)" fill="url(#dlg-splash)" stroke="none">
            <path d="M2964 5671 c-20 -9 -918 -521 -1604 -914 -173 -100 -362 -207 -420 -239 -58 -32 -118 -73 -133 -91 -58 -67 -57 -45 -57 -1067 0 -831 2 -938 16 -958 l15 -22 758 0 c417 0 761 3 764 6 12 13 -26 67 -283 399 -64 83 -120 156 -124 163 -5 7 4 32 22 60 16 26 238 396 493 822 254 426 569 951 699 1165 308 506 305 502 290 520 -7 8 -72 48 -144 87 -124 69 -135 73 -201 75 -38 2 -79 -1 -91 -6z"/>
            <path d="M3683 5328 c-18 -23 -833 -1306 -833 -1312 0 -12 83 -15 485 -21 230 -3 420 -7 421 -8 4 -5 451 -755 657 -1102 438 -739 668 -1120 691 -1143 l23 -24 71 36 c91 46 139 88 152 134 14 50 14 2403 0 2453 -20 72 -48 98 -215 193 -766 440 -1414 806 -1427 806 -9 0 -20 -6 -25 -12z"/>
            <path d="M4037 2838 c-25 -33 -443 -702 -467 -747 l-12 -24 -1384 4 c-1247 4 -1385 2 -1399 -12 -44 -44 -21 -170 42 -231 21 -20 203 -132 408 -249 385 -220 1034 -594 1310 -754 88 -51 183 -105 210 -121 28 -15 88 -49 134 -76 158 -90 177 -86 475 84 127 72 416 236 641 363 226 128 507 287 625 354 212 121 250 145 250 163 0 5 -40 73 -88 151 -49 78 -177 286 -284 462 -393 643 -407 664 -430 665 -4 0 -18 -15 -31 -32z"/>
          </g>
        </svg>
      </div>
    </div>
  )
}

function AppHeader(): JSX.Element {
  const t = useT()
  return (
    <>
      <DodaiLogo />
      <h1 className="text-2xl font-bold gradient-text mb-1">Dodai 3D</h1>
      <p className="text-sm text-zinc-600 mb-10 font-medium">{t.setup.starting.replace('…', '')}</p>
    </>
  )
}

// ─── Panels ─────────────────────────────────────────────────────────────────

const panelStyle = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
}

function CheckingPanel(): JSX.Element {
  const t = useT()
  return (
    <div className="w-80 rounded-2xl p-6" style={panelStyle}>
      <p className="text-sm font-semibold text-zinc-100">{t.setup.checking}</p>
      <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full animate-pulse" style={{ width: '30%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }} />
      </div>
    </div>
  )
}

function ChoosePathPanel({ defaultPath, onConfirm }: { defaultPath: string; onConfirm: (path: string) => void }): JSX.Element {
  const [selectedPath, setSelectedPath] = useState(defaultPath || '')
  const t = useT()

  useEffect(() => {
    if (defaultPath && !selectedPath) setSelectedPath(defaultPath)
  }, [defaultPath])

  async function handleBrowse() {
    const picked = await window.electron.fs.selectDirectory()
    if (picked) setSelectedPath(picked)
  }

  return (
    <div className="w-80 rounded-2xl p-6" style={panelStyle}>
      <p className="text-sm font-semibold text-zinc-100 mb-1">{t.setup.chooseFolder}</p>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">{t.setup.chooseFolderDesc}</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-mono text-zinc-400 truncate" title={selectedPath}>
            {selectedPath || t.setup.noFolder}
          </p>
        </div>
        <button
          onClick={handleBrowse}
          className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {t.setup.browse}
        </button>
      </div>

      <button
        onClick={() => onConfirm(selectedPath)}
        disabled={!selectedPath}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all btn-gradient disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t.setup.continue}
      </button>
    </div>
  )
}

function InstallingPanel({ progress }: { progress: SetupProgress | null }): JSX.Element {
  const t = useT()
  const STEPS = [
    { key: 'enabling-site', label: t.setup.stepPython },
    { key: 'pip',           label: t.setup.stepPip },
    { key: 'packages',      label: t.setup.stepPackages },
  ] as const

  function stepIndex(step: string) {
    return STEPS.findIndex((s) => s.key === step)
  }

  const currentIdx = progress ? stepIndex(progress.step) : -1
  const percent    = progress?.percent ?? 0

  return (
    <div className="w-80 rounded-2xl p-6" style={panelStyle}>
      <p className="text-sm font-semibold text-zinc-100 mb-4">{t.setup.installing}</p>

      <div className="flex gap-2 mb-4">
        {STEPS.map((step, idx) => {
          const done   = idx < currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.key} className="flex-1 min-w-0">
              <div
                className="h-1 rounded-full transition-all"
                style={{
                  background: done   ? 'linear-gradient(90deg, #8b5cf6, #3b82f6)' :
                              active ? 'rgba(139,92,246,0.5)'                      :
                                       'rgba(255,255,255,0.06)',
                  animation: active ? 'pulse 1.5s ease-in-out infinite' : undefined,
                }}
              />
              <p className={`text-[10px] mt-1 truncate font-medium ${active ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>

      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }}
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-zinc-600 truncate flex-1 min-w-0">
          {progress?.currentPackage ?? (currentIdx >= 0 ? STEPS[currentIdx]?.label : t.setup.initialising)}
        </p>
        <p className="text-xs text-zinc-600 ml-2 shrink-0 font-mono">{percent}%</p>
      </div>
    </div>
  )
}

function StartingPanel(): JSX.Element {
  const t = useT()
  return (
    <div className="w-80 rounded-2xl p-6" style={panelStyle}>
      <p className="text-sm font-semibold text-zinc-100">{t.setup.starting}</p>
      <p className="text-xs text-zinc-500 mt-1">{t.setup.startingDesc}</p>
      <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full animate-pulse" style={{ width: '40%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }} />
      </div>
    </div>
  )
}

function ApplyingUpdatePanel({ version }: { version: string }): JSX.Element {
  const t = useT()
  return (
    <div className="w-80 rounded-2xl p-6" style={panelStyle}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{t.setup.applyingUpdate} {version}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t.setup.applyingDesc}</p>
        </div>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full animate-pulse" style={{ width: '70%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }} />
      </div>
    </div>
  )
}

function ErrorPanel({ message }: { message: string | null }): JSX.Element {
  const t = useT()
  return (
    <div className="w-80 rounded-2xl p-6" style={{ ...panelStyle, borderColor: 'rgba(239,68,68,0.15)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{t.setup.error}</p>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{message ?? t.setup.errorDesc}</p>
        </div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-gradient transition-all"
      >
        {t.setup.retry}
      </button>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function FirstRunSetup(): JSX.Element {
  const { setupStatus, setupProgress, setupError, saveDataDir, defaultDataDir, backendStatus, backendError } =
    useAppStore()
  const [applyingVersion, setApplyingVersion] = useState<string | null>(null)

  useEffect(() => {
    window.electron.updater.onApplying(({ version }) => setApplyingVersion(`v${version}`))
    return () => { window.electron.updater.offApplying() }
  }, [])

  const renderPanel = () => {
    if (applyingVersion) return <ApplyingUpdatePanel version={applyingVersion} />
    switch (setupStatus) {
      case 'idle':
      case 'checking':
        return <CheckingPanel />
      case 'needed':
        return <ChoosePathPanel defaultPath={defaultDataDir} onConfirm={saveDataDir} />
      case 'installing':
        return <InstallingPanel progress={setupProgress} />
      case 'done':
        if (backendStatus === 'error') return <ErrorPanel message={backendError} />
        return <StartingPanel />
      case 'error':
        return <ErrorPanel message={setupError} />
      default:
        return <StartingPanel />
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#09090b' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.07) 0%, transparent 65%)',
      }} />

      {/* Title bar */}
      <div className="flex items-center h-9 px-3 shrink-0 drag-region relative z-10">
        <div className="flex-1" />
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => window.electron.window.minimize()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors"
            aria-label="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
          </button>
          <button
            onClick={() => window.electron.window.close()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-white hover:bg-red-600 transition-colors"
            aria-label="Close"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2">
              <line x1="0" y1="0" x2="9" y2="9" />
              <line x1="9" y1="0" x2="0" y2="9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 items-center justify-center relative z-10">
        <AppHeader />
        {renderPanel()}
      </div>
    </div>
  )
}
