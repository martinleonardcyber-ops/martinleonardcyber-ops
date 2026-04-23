import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAppStore } from '@shared/stores/appStore'
import { useNavStore, type Page } from '@shared/stores/navStore'

const PAGE_LABELS: Record<Page, string> = {
  dashboard: 'Dashboard',
  generate:  'Generate',
  workflows: 'Workflows',
  models:    'Extensions',
  settings:  'Settings',
}

// ─── VRAM chip ────────────────────────────────────────────────────────────────

function VramChip() {
  const apiUrl = useAppStore((s) => s.apiUrl)
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

  const usedPct  = vramTotal > 0 ? ((vramTotal - (vramFree ?? 0)) / vramTotal) * 100 : 0
  const color    = usedPct > 85 ? 'bg-red-400' : usedPct > 65 ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <div className="no-drag flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-full bg-zinc-800/70 border border-zinc-700/40" title={`VRAM: ${(vramTotal - (vramFree ?? 0)).toFixed(1)} / ${vramTotal} GB used`}>
      <div className="relative w-3 h-3 shrink-0">
        <div className="absolute inset-0 rounded-full bg-zinc-700" />
        <div
          className={`absolute bottom-0 left-0 right-0 rounded-full transition-all ${color}`}
          style={{ height: `${usedPct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-zinc-400">
        {vramFree?.toFixed(1)}GB free
      </span>
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar(): JSX.Element {
  const { patchUpdateReady } = useAppStore()
  const currentPage = useNavStore((s) => s.currentPage)

  const handleMinimize = () => window.electron.window.minimize()
  const handleMaximize = () => window.electron.window.maximize()
  const handleClose    = () => window.electron.window.close()

  return (
    <header
      className="flex items-center h-9 px-3 border-b border-white/[0.05] drag-region shrink-0"
      style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)' }}
    >
      {/* Page breadcrumb */}
      <span className="no-drag text-[12px] font-medium text-zinc-500 select-none">
        {PAGE_LABELS[currentPage]}
      </span>

      <div className="flex-1" />

      {/* Live VRAM monitor */}
      <VramChip />

      {/* Patch update badge */}
      {patchUpdateReady && (
        <div className="no-drag flex items-center gap-2 mr-3 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[11px] text-violet-300">
          <span>Update ready</span>
          <button
            onClick={() => window.electron.updater.quitAndInstall()}
            className="ml-1 px-2 py-0.5 rounded-full btn-gradient text-white text-[10px] font-medium"
          >
            Restart
          </button>
        </div>
      )}

      {/* Window controls */}
      <div className="no-drag flex items-center gap-0.5">
        <button onClick={handleMinimize} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors">
          <svg width="9" height="1" viewBox="0 0 9 1" fill="currentColor"><rect width="9" height="1"/></svg>
        </button>
        <button onClick={handleMaximize} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="7" height="7"/></svg>
        </button>
        <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-white hover:bg-red-600 transition-colors">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="9" y2="9"/><line x1="9" y1="0" x2="0" y2="9"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
