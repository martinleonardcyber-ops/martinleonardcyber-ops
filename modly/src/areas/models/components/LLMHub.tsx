import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAppStore } from '@shared/stores/appStore'
import { useT } from '@shared/i18n'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Variant {
  filename:   string
  quant:      string
  size_gb:    number | null
  downloaded: boolean
}

interface HubModel {
  id:          string
  name:        string
  author:      string
  description?: string
  params?:     string
  min_vram_gb?: number
  downloads?:  number
  likes?:      number
  tags:        string[]
  variants:    Variant[]
}

interface DownloadState {
  progress: number
  total:    number
  done:     boolean
  error:    string | null
}

// ── Tag pill ──────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  recommended: 'bg-violet-900/60 text-violet-300 border-violet-700/40',
  chat:        'bg-blue-900/40   text-blue-300   border-blue-700/30',
  coding:      'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  reasoning:   'bg-amber-900/40  text-amber-300   border-amber-700/30',
  français:    'bg-red-900/40    text-red-300      border-red-700/30',
  multilingual:'bg-indigo-900/40 text-indigo-300  border-indigo-700/30',
  fast:        'bg-cyan-900/40   text-cyan-300     border-cyan-700/30',
  lightweight: 'bg-zinc-800/60   text-zinc-300     border-zinc-700/30',
}

function TagPill({ tag }: { tag: string }) {
  const cls = TAG_COLORS[tag] ?? 'bg-zinc-800/60 text-zinc-400 border-zinc-700/30'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${cls}`}>
      {tag}
    </span>
  )
}

// ── Model card ────────────────────────────────────────────────────────────────

function ModelCard({
  model, apiUrl, onDownloaded,
}: {
  model:        HubModel
  apiUrl:       string
  onDownloaded: (filename: string) => void
}) {
  const t = useT()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [dlState, setDlState] = useState<DownloadState | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const variant = model.variants[selectedIdx]

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPoll(), [])

  async function startDownload() {
    if (!variant) return
    setDlState({ progress: 0, total: 0, done: false, error: null })
    await axios.post(`${apiUrl}/llm/hub/download`, { repo_id: model.id, filename: variant.filename })

    pollRef.current = setInterval(async () => {
      try {
        const r = await axios.get<DownloadState>(`${apiUrl}/llm/hub/download/${encodeURIComponent(variant.filename)}/progress`)
        setDlState(r.data)
        if (r.data.done || r.data.error) {
          stopPoll()
          if (r.data.done) onDownloaded(variant.filename)
        }
      } catch { stopPoll() }
    }, 800)
  }

  async function cancelDownload() {
    if (!variant) return
    stopPoll()
    await axios.delete(`${apiUrl}/llm/hub/download/${encodeURIComponent(variant.filename)}`)
    setDlState(null)
  }

  async function deleteModel() {
    if (!variant) return
    await axios.delete(`${apiUrl}/llm/models/${encodeURIComponent(variant.filename)}`)
    onDownloaded(variant.filename)
    setDlState(null)
  }

  const isDownloading = dlState && !dlState.done && !dlState.error
  const percent = dlState && dlState.total > 0
    ? Math.round((dlState.progress / dlState.total) * 100) : 0

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60 transition-all"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">{model.name}</h3>
            {model.params && (
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-0.5 rounded">
                {model.params}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{model.author}</p>
        </div>
        {model.downloads != null && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-zinc-600">{(model.downloads / 1000).toFixed(0)}k dl</p>
          </div>
        )}
      </div>

      {/* Description */}
      {model.description && (
        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{model.description}</p>
      )}

      {/* Tags */}
      {model.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {model.tags.slice(0, 4).map((tag) => <TagPill key={tag} tag={tag} />)}
        </div>
      )}

      {/* Variant selector */}
      {model.variants.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {model.variants.map((v, i) => (
            <button
              key={v.filename}
              onClick={() => { setSelectedIdx(i); setDlState(null); stopPoll() }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border transition-all ${
                i === selectedIdx
                  ? 'bg-violet-900/50 border-violet-600/50 text-violet-200'
                  : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {v.quant}
              {v.size_gb != null && <span className="ml-1 opacity-60">{v.size_gb}GB</span>}
            </button>
          ))}
        </div>
      )}

      {/* Single variant info */}
      {model.variants.length === 1 && variant && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/40 px-2 py-0.5 rounded-lg">
            {variant.quant}
          </span>
          {variant.size_gb != null && (
            <span className="text-[11px] text-zinc-500">{variant.size_gb} GB</span>
          )}
        </div>
      )}

      {/* Download progress */}
      {isDownloading && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">{t.models.downloading} {percent}%</span>
            {dlState.total > 0 && (
              <span className="text-[10px] text-zinc-600 font-mono">
                {(dlState.progress / 1e9).toFixed(2)} / {(dlState.total / 1e9).toFixed(2)} GB
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-zinc-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }}
            />
          </div>
        </div>
      )}

      {dlState?.error && (
        <p className="text-[11px] text-red-400 truncate">{dlState.error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        {variant?.downloaded ? (
          <div className="flex gap-2 w-full">
            <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/20 border border-emerald-700/30">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400 shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-[11px] text-emerald-400 font-medium">{t.models.downloaded}</span>
            </div>
            <button
              onClick={deleteModel}
              className="px-2.5 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 hover:text-red-400 hover:border-red-800/40 transition-colors"
              title={t.models.delete}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
            </button>
          </div>
        ) : isDownloading ? (
          <button
            onClick={cancelDownload}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Annuler
          </button>
        ) : (
          <button
            onClick={startDownload}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white btn-gradient transition-all"
          >
            {t.models.download}
            {variant?.size_gb != null && (
              <span className="ml-1 opacity-70 text-[10px]">{variant.size_gb} GB</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LLMHub() {
  const t = useT()
  const apiUrl = useAppStore((s) => s.apiUrl)
  const [tab, setTab] = useState<'featured' | 'search'>('featured')
  const [featured, setFeatured] = useState<HubModel[]>([])
  const [searchResults, setSearchResults] = useState<HubModel[]>([])
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!apiUrl) return
    setLoadingFeatured(true)
    axios.get<HubModel[]>(`${apiUrl}/llm/hub/featured`)
      .then((r) => setFeatured(r.data))
      .finally(() => setLoadingFeatured(false))
  }, [apiUrl, refreshKey])

  async function doSearch(q: string) {
    if (!apiUrl) return
    setSearching(true)
    try {
      const r = await axios.get<HubModel[]>(`${apiUrl}/llm/hub/search`, { params: { q } })
      setSearchResults(r.data)
      setTab('search')
    } finally {
      setSearching(false)
    }
  }

  const models = tab === 'featured' ? featured : searchResults

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">{t.models.llmTab}</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">Téléchargez et gérez vos modèles LLM locaux</p>
          </div>
        </div>

        {/* Search */}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); if (query.trim()) doSearch(query.trim()) }}
        >
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 focus-within:border-zinc-500 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher sur HuggingFace… (ex: Llama, Mistral, Qwen)"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setTab('featured') }} className="text-zinc-600 hover:text-zinc-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white btn-gradient disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {searching ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : 'Rechercher'}
          </button>
        </form>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {([['featured', '⭐ Sélection'], ['search', '🔍 Résultats']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              disabled={key === 'search' && searchResults.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 ${
                tab === key
                  ? 'bg-zinc-700/80 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label} {key === 'search' && searchResults.length > 0 && `(${searchResults.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Models grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loadingFeatured && tab === 'featured' ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="text-zinc-700">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p className="text-sm text-zinc-500">Aucun résultat</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {models.map((m) => (
              <ModelCard
                key={m.id + (m.variants[0]?.filename ?? '')}
                model={m}
                apiUrl={apiUrl}
                onDownloaded={() => setRefreshKey((k) => k + 1)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
