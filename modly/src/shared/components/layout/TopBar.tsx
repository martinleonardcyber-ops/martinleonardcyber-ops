import { useAppStore } from '@shared/stores/appStore'
import { useNavStore, type Page } from '@shared/stores/navStore'

const PAGE_LABELS: Record<Page, string> = {
  dashboard: 'Dashboard',
  generate:  'Generate',
  workflows: 'Workflows',
  models:    'Extensions',
  settings:  'Settings',
}

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

      {/* Drag fill */}
      <div className="flex-1" />

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
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
        >
          <svg width="9" height="1" viewBox="0 0 9 1" fill="currentColor">
            <rect width="9" height="1" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="7" height="7" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-white hover:bg-red-600 transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="9" y2="9" />
            <line x1="9" y1="0" x2="0" y2="9" />
          </svg>
        </button>
      </div>
    </header>
  )
}
