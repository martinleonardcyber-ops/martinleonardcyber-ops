import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useExtensionsStore } from '@shared/stores/extensionsStore'
import type { AnyExtension, ModelExtension } from '@shared/types/electron.d'
import { formatModelName } from './utils'
import { ExtensionCard } from './components/ExtensionCard'
import type { ExtensionNode } from './components/ExtensionCard'
import { useHardware } from '@shared/hooks/useHardware'
import type { HardwareInfo } from '@shared/hooks/useHardware'
import LLMHub from './components/LLMHub'
import { useT } from '@shared/i18n'

// ─── Hardware banner ──────────────────────────────────────────────────────────

function HardwareBanner({ info }: { info: HardwareInfo }) {
  const tier = info.recommended_tier

  const tierColor = {
    none: 'from-zinc-900/80 border-zinc-700/40',
    low:  'from-amber-950/40 border-amber-800/30',
    mid:  'from-blue-950/40  border-blue-800/30',
    high: 'from-emerald-950/40 border-emerald-800/30',
  }[tier]

  const dot = {
    none: 'bg-zinc-500',
    low:  'bg-amber-400',
    mid:  'bg-blue-400',
    high: 'bg-emerald-400',
  }[tier]

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border bg-gradient-to-r ${tierColor} to-transparent mb-4`}>
      <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>
          <path d="M6 2v4M18 2v4M6 18v4M18 18v4"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          <p className="text-xs font-semibold text-zinc-200 truncate">
            {info.gpu_name ?? 'No GPU detected'}
          </p>
          {info.cuda_available && (
            <span className="shrink-0 text-[10px] font-mono text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-0.5 rounded">
              {info.vram_total_gb} GB VRAM
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{info.recommended_tier_label}</p>
      </div>
      {info.ram_gb > 0 && (
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-[10px] text-zinc-600">System RAM</p>
          <p className="text-[11px] font-mono text-zinc-400">{info.ram_gb} GB</p>
        </div>
      )}
    </div>
  )
}

// ─── 3D Extensions tab ────────────────────────────────────────────────────────

function ThreeDModelsTab() {
  const { info: hwInfo, compatibility } = useHardware()

  const modelExtensions   = useExtensionsStore((s) => s.modelExtensions)
  const processExtensions = useExtensionsStore((s) => s.processExtensions)
  const extLoading        = useExtensionsStore((s) => s.loading)
  const installProgress   = useExtensionsStore((s) => s.installProgress)
  const installError      = useExtensionsStore((s) => s.installError)
  const loadErrors        = useExtensionsStore((s) => s.loadErrors)
  const loadExtensions    = useExtensionsStore((s) => s.loadExtensions)
  const installFromGH     = useExtensionsStore((s) => s.installFromGitHub)
  const uninstallExt      = useExtensionsStore((s) => s.uninstall)
  const reloadExtensions  = useExtensionsStore((s) => s.reload)
  const clearInstall      = useExtensionsStore((s) => s.clearInstallState)

  const compatRank = (ext: AnyExtension): number => {
    if (ext.type !== 'model') return 2
    const c = compatibility(ext.vram_gb ?? 0)
    return { recommended: 0, ok: 1, warning: 2, unknown: 3, incompatible: 4 }[c] ?? 3
  }

  const allExtensions: AnyExtension[] = [
    ...modelExtensions,
    ...processExtensions,
  ].sort((a, b) => {
    const rankDiff = compatRank(a) - compatRank(b)
    if (rankDiff !== 0) return rankDiff
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const [installedVariantIds, setInstalledVariantIds] = useState<string[]>([])
  const [downloading, setDownloading] = useState<Record<string, { percent: number; file?: string; fileIndex?: number; totalFiles?: number }>>({})
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null)
  const [modelsToDelete,  setModelsToDelete]  = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showGHForm, setShowGHForm] = useState(false)
  const [ghUrl,      setGhUrl]      = useState('')
  const [ghErr,      setGhErr]      = useState<string | null>(null)

  async function refreshInstalledIds(exts: ModelExtension[]) {
    const ids: string[] = []
    for (const ext of exts) {
      for (const node of ext.nodes) {
        if (!node.hfRepo) continue
        const fullId = `${ext.id}/${node.id}`
        const ok = await window.electron.model.isDownloaded(fullId)
        if (ok) ids.push(fullId)
      }
    }
    setInstalledVariantIds(ids)
  }

  useEffect(() => {
    loadExtensions().then(() => {
      const exts = useExtensionsStore.getState().modelExtensions
      refreshInstalledIds(exts)
    })
    window.electron.model.onProgress(({ modelId: id, percent, file, fileIndex, totalFiles }) => {
      setDownloading((prev) => ({ ...prev, [id]: { percent, file, fileIndex, totalFiles } }))
      if (percent === 100) {
        const exts = useExtensionsStore.getState().modelExtensions
        refreshInstalledIds(exts).then(() => {
          setDownloading((prev) => { const n = { ...prev }; delete n[id]; return n })
        })
      }
    })
    return () => window.electron.model.offProgress()
  }, [])

  useEffect(() => {
    if (installError) setGhErr(installError)
  }, [installError])

  async function handleGHInstall() {
    const url = ghUrl.trim()
    if (!url) { setGhErr('GitHub URL required'); return }
    if (!url.includes('github.com')) { setGhErr('Must be a GitHub URL'); return }
    setGhErr(null)
    clearInstall()
    const result = await installFromGH(url)
    if (result.success) {
      setShowGHForm(false)
      setGhUrl('')
    } else {
      setGhErr(result.error ?? 'Installation failed')
    }
  }

  function openUninstallModal(extId: string) {
    const ext = allExtensions.find((e) => e.id === extId)
    if (ext?.type === 'model') {
      const installedModels = ext.nodes.filter((n) => installedVariantIds.includes(`${extId}/${n.id}`))
      setModelsToDelete(new Set(installedModels.map((n) => `${extId}/${n.id}`)))
    } else {
      setModelsToDelete(new Set())
    }
    setUninstallTarget(extId)
  }

  async function handleUninstallExtension(extId: string) {
    for (const modelId of modelsToDelete) {
      await window.electron.model.delete(modelId)
    }
    await uninstallExt(extId)
    setUninstallTarget(null)
    setModelsToDelete(new Set())
    refreshInstalledIds(useExtensionsStore.getState().modelExtensions)
  }

  const isInstalling = installProgress !== null &&
    installProgress.step !== 'done' &&
    installProgress.step !== 'error'

  const isBusy = isInstalling || Object.keys(downloading).length > 0

  const filteredExtensions = search.trim()
    ? allExtensions.filter((e) =>
        e.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (e.description ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
        (e.author ?? '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : allExtensions

  function installProgressLabel(): string {
    if (!installProgress) return ''
    switch (installProgress.step) {
      case 'downloading': return `Downloading… ${installProgress.percent ?? 0}%`
      case 'extracting':  return 'Extracting…'
      case 'validating':  return 'Validating…'
      case 'setting_up':  return 'Setting up environment…'
      case 'done':        return 'Installed!'
      default:            return ''
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-4 pb-4 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-zinc-100">Extensions 3D</h1>
          <button
            onClick={() => { setShowGHForm((v) => !v); setGhErr(null); clearInstall() }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all border border-zinc-700/60"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.997.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.51 11.51 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            {showGHForm ? 'Annuler' : 'Installer depuis GitHub'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 focus-within:border-zinc-500 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher extensions…"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <button onClick={reloadExtensions} disabled={extLoading}
            className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className={extLoading ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* GitHub install form */}
      {showGHForm && (
        <div className="px-6 pt-4 pb-5 border-b border-zinc-800/60 shrink-0">
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex gap-2">
              <input type="text" value={ghUrl}
                onChange={(e) => { setGhUrl(e.target.value); setGhErr(null); clearInstall() }}
                onKeyDown={(e) => e.key === 'Enter' && !isInstalling && handleGHInstall()}
                placeholder="https://github.com/owner/repo" autoFocus disabled={isInstalling}
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              />
              <button onClick={handleGHInstall} disabled={!ghUrl.trim() || isInstalling}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                {isInstalling ? <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Installer'}
                {!isInstalling ? '' : installProgressLabel()}
              </button>
            </div>
            {ghErr && (
              <p className="text-[11px] text-red-400">{ghErr}</p>
            )}
            {installProgress?.step === 'done' && (
              <p className="text-[11px] text-emerald-400">Extension installée avec succès !</p>
            )}
          </div>
        </div>
      )}

      {/* Extensions list */}
      <div className="flex-1 overflow-y-auto p-6">
        {hwInfo && <HardwareBanner info={hwInfo} />}
        {allExtensions.length === 0 && !extLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="text-zinc-700">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-400">Aucune extension installée</p>
              <p className="text-xs text-zinc-600 mt-1">Installez depuis GitHub ou déposez dans <span className="font-mono text-zinc-500">%appdata%/Dodai/extensions</span></p>
            </div>
          </div>
        ) : extLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
          </div>
        ) : filteredExtensions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <p className="text-sm text-zinc-500">Aucun résultat pour <span className="text-zinc-300">"{search}"</span></p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {filteredExtensions.map((ext) => (
              <ExtensionCard
                key={ext.id} ext={ext} installedIds={installedVariantIds}
                downloading={downloading} disabled={isBusy}
                compatibility={ext.type === 'model' ? compatibility(ext.vram_gb ?? 0) : 'ok'}
                loadError={loadErrors[ext.id] ?? ext.nodes.map((n) => loadErrors[`${ext.id}/${n.id}`]).find(Boolean)}
                onInstall={(node: ExtensionNode, fullId: string) => {
                  if (!node.hfRepo) return
                  setDownloading((prev) => ({ ...prev, [fullId]: { percent: 0 } }))
                  window.electron.model.download(node.hfRepo!, fullId, node.hfSkipPrefixes).then((result: { success: boolean }) => {
                    if (!result.success) setDownloading((prev) => { const n = { ...prev }; delete n[fullId]; return n })
                  })
                }}
                onUninstallNode={async (fullId: string) => {
                  await window.electron.model.delete(fullId)
                  refreshInstalledIds(useExtensionsStore.getState().modelExtensions)
                }}
                onUninstall={(extId) => openUninstallModal(extId)}
                onRepaired={() => reloadExtensions()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Uninstall modal */}
      {uninstallTarget && (() => {
        const ext = allExtensions.find((e) => e.id === uninstallTarget)
        const installedModels = ext?.type === 'model'
          ? ext.nodes.filter((n) => installedVariantIds.includes(`${uninstallTarget}/${n.id}`))
          : []
        return createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center"
            onMouseDown={(e) => { if (e.target === e.currentTarget) { setUninstallTarget(null); setModelsToDelete(new Set()) } }}
          >
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" />
            <div className="relative w-96 rounded-2xl bg-zinc-900 border border-accent/20 shadow-2xl overflow-hidden">
              <div className="px-5 py-5 flex flex-col gap-4">
                <h2 className="text-base font-semibold text-zinc-100">Désinstaller "{ext?.name ?? uninstallTarget}" ?</h2>
                <p className="text-xs text-zinc-500">Le dossier de l'extension sera supprimé définitivement.</p>
                {installedModels.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium text-zinc-400">Supprimer aussi les poids téléchargés :</p>
                    {installedModels.map((v) => {
                      const id = `${uninstallTarget}/${v.id}`
                      const checked = modelsToDelete.has(id)
                      return (
                        <label key={v.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 cursor-pointer">
                          <input type="checkbox" checked={checked}
                            onChange={() => setModelsToDelete((prev) => { const next = new Set(prev); if (checked) next.delete(id); else next.add(id); return next })}
                            className="accent-accent w-3.5 h-3.5 rounded"
                          />
                          <span className="text-xs text-zinc-200">{formatModelName(id)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <div className="flex gap-2.5">
                  <button onClick={() => { setUninstallTarget(null); setModelsToDelete(new Set()) }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-400 text-sm font-medium transition-colors border border-zinc-700/50"
                  >Annuler</button>
                  <button onClick={() => handleUninstallExtension(uninstallTarget)}
                    className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-sm font-semibold transition-colors"
                  >Désinstaller</button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModelsPage(): JSX.Element {
  const t = useT()
  const [mainTab, setMainTab] = useState<'llm' | '3d'>('llm')

  return (
    <div className="h-full flex flex-col">
      {/* Tab switcher */}
      <div className="flex items-center gap-0 px-6 pt-3 border-b border-zinc-800/60 shrink-0">
        {(['llm', '3d'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mainTab === tab
                ? 'border-violet-500 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'llm' ? t.models.llmTab : t.models.threeDTab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mainTab === 'llm' ? <LLMHub /> : <ThreeDModelsTab />}
      </div>
    </div>
  )
}
