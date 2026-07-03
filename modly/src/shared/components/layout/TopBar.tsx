import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAppStore } from '@shared/stores/appStore'
import { useNavStore, type Page } from '@shared/stores/navStore'
import { useT } from '@shared/i18n'

// ─── Page icon map ────────────────────────────────────────────────────────────

function PageIcon({ page }: { page: Page }) {
  const props = { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (page) {
    case 'dashboard':
      return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    case 'generate':
      return <svg {...props}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    case 'workflows':
      return <svg {...props}><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 6h4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7"/></svg>
    case 'chat':
      return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'models':
      return <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
    case 'settings':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  }
}

// ─── VRAM chip ────────────────────────────────────────────────────────────────

function VramChip() {
  const apiUrl = useAppStore((s) => s.apiUrl)
  const t = useT()
  const [vramFree,  setVramFree]  = useState<number | null>(null)
  const [vramTotal, setVramTotal] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const { data } = await axios.get(`${apiUrl}/hardware/info`, { timeout: 2000 })
        if (!active) return
        if (data.cuda_available) {
          setVramFree(data.vram_free_gb)
          setVramTotal(data.vram_total_gb)
        }
      } catch { /* backend not ready yet */ }
      if (active) setTimeout(poll, 5000)
    }
    poll()
    return () => { active = false }
  }, [apiUrl])

  if (vramTotal === null || vramTotal === 0) return null

  const usedPct = vramTotal > 0 ? ((vramTotal - (vramFree ?? 0)) / vramTotal) * 100 : 0
  const color   = usedPct > 85 ? '#f87171' : usedPct > 65 ? '#fbbf24' : '#34d399'

  return (
    <div
      className="no-drag flex items-center gap-2 mr-2 px-3 py-1 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      title={`VRAM: ${(vramTotal - (vramFree ?? 0)).toFixed(1)} / ${vramTotal} GB used`}
    >
      {/* Mini bar */}
      <div className="relative w-12 h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{ width: `${usedPct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>
        {vramFree?.toFixed(1)}GB {t.vram.free}
      </span>
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar(): JSX.Element {
  const { patchUpdateReady } = useAppStore()
  const currentPage = useNavStore((s) => s.currentPage)
  const t = useT()

  const handleMinimize = () => window.electron.window.minimize()
  const handleMaximize = () => window.electron.window.maximize()
  const handleClose    = () => window.electron.window.close()

  return (
    <header
      className="flex items-center h-9 px-3 shrink-0 drag-region glass-panel"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.02), 0 4px 16px rgba(0,0,0,0.2)',
        zIndex: 20,
      }}
    >
      {/* Page breadcrumb */}
      <div className="no-drag flex items-center gap-1.5">
        <span className="text-zinc-700">
          <PageIcon page={currentPage} />
        </span>
        <span className="text-[11.5px] font-semibold text-zinc-500 select-none tracking-wide">
          {t.nav[currentPage]}
        </span>
      </div>

      <div className="flex-1" />

      {/* VRAM monitor */}
      <VramChip />

      {/* Patch update badge */}
      {patchUpdateReady && (
        <div className="no-drag flex items-center gap-2 mr-3 px-3 py-1 rounded-full text-[11px]"
          style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: '#c4b5fd',
          }}
        >
          <span>{t.topbar.updateReady}</span>
          <button
            onClick={() => window.electron.updater.quitAndInstall()}
            className="ml-1 px-2 py-0.5 rounded-full btn-gradient text-white text-[10px] font-semibold"
          >
            {t.topbar.restart}
          </button>
        </div>
      )}

      {/* Window controls */}
      <div className="no-drag flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors"
        >
          <svg width="9" height="1" viewBox="0 0 9 1" fill="currentColor"><rect width="9" height="1"/></svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="7" height="7"/></svg>
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-white hover:bg-red-600 transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="9" y2="9"/><line x1="9" y1="0" x2="0" y2="9"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
