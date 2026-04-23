import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { useNavStore } from '@shared/stores/navStore'
import { useAppStore } from '@shared/stores/appStore'
import { useFavoritesStore } from '@shared/stores/favoritesStore'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentJob {
  filename:   string
  collection: string
  url?:       string
  createdAt?: number
}

// ─── Mini 3D viewer ───────────────────────────────────────────────────────────

function GLBScene({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} dispose={null} />
}

function MiniViewer({ url }: { url: string }) {
  return (
    <Canvas
      camera={{ fov: 40, position: [0, 0.5, 2.5] }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <GLBScene url={url} />
        <OrbitControls
          autoRotate
          autoRotateSpeed={3}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  )
}

// ─── Export dropdown ──────────────────────────────────────────────────────────

const EXPORT_FORMATS = [
  { fmt: 'glb', label: 'GLB',  mime: 'model/gltf-binary' },
  { fmt: 'obj', label: 'OBJ',  mime: 'text/plain' },
  { fmt: 'stl', label: 'STL',  mime: 'model/stl' },
  { fmt: 'ply', label: 'PLY',  mime: 'application/octet-stream' },
]

function ExportMenu({ job, apiUrl }: { job: RecentJob; apiUrl: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function download(fmt: string, mime: string) {
    if (!job.url) return
    setBusy(fmt)
    try {
      const relPath = job.url.replace('/workspace/', '')
      const resp = await axios.get(`${apiUrl}/export/${fmt}`, {
        params: { path: relPath },
        responseType: 'blob',
      })
      const blob = new Blob([resp.data], { type: mime })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = job.filename.replace(/\.[^.]+$/, `.${fmt}`)
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { /* silent */ } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        title="Export"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 w-28 rounded-xl bg-zinc-900 border border-zinc-700/60 shadow-xl z-50 overflow-hidden">
          {EXPORT_FORMATS.map(({ fmt, label, mime }) => (
            <button
              key={fmt}
              onClick={(e) => { e.stopPropagation(); download(fmt, mime) }}
              disabled={!!busy}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
            >
              <span>{label}</span>
              {busy === fmt ? (
                <div className="w-2.5 h-2.5 rounded-full border border-zinc-500 border-t-zinc-200 animate-spin" />
              ) : (
                <span className="text-zinc-600 font-mono text-[9px]">.{fmt}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Model card ───────────────────────────────────────────────────────────────

function ModelCard({ job, apiUrl, onOpen }: { job: RecentJob; apiUrl: string; onOpen: () => void }) {
  const key        = `${job.collection}/${job.filename}`
  const { toggle, isFav } = useFavoritesStore()
  const fav        = isFav(key)
  const name       = job.filename.replace(/\.[^.]+$/, '')
  const date       = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : null
  const fullUrl    = job.url ? `${apiUrl}${job.url}` : null
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group flex flex-col glass rounded-xl overflow-hidden hover:border-violet-500/20 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Preview */}
      <div className="aspect-square bg-gradient-to-br from-zinc-900 to-[#09090b] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-card-glow" />
        {fullUrl && hovered ? (
          <MiniViewer url={fullUrl} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 group-hover:text-zinc-500 transition-colors relative z-10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
        )}

        {/* Actions overlay */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => { e.stopPropagation(); toggle(key) }}
            className={`p-1.5 rounded-lg border transition-colors ${
              fav
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-zinc-900/80 border-zinc-700/50 text-zinc-500 hover:text-amber-400 hover:border-amber-500/40'
            }`}
            title={fav ? 'Remove from favourites' : 'Add to favourites'}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          {job.url && <ExportMenu job={job} apiUrl={apiUrl} />}
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[12px] font-medium text-zinc-200 truncate">{name}</p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[10px] text-zinc-600 truncate">{job.collection}</p>
          {date && <p className="text-[10px] text-zinc-700 shrink-0 ml-2">{date}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickCard({ icon, title, desc, accentClass, borderHover, onClick }: {
  icon: JSX.Element; title: string; desc: string
  accentClass: string; borderHover: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col gap-3 p-5 rounded-2xl glass text-left transition-all duration-200 hover:scale-[1.02] ${borderHover}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentClass} transition-colors`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
      </div>
      <span className="self-end text-zinc-700 group-hover:text-zinc-400 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    </button>
  )
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
  const { navigate }  = useNavStore()
  const apiUrl        = useAppStore((s) => s.apiUrl)
  const { isFav }     = useFavoritesStore()

  const [allJobs,     setAllJobs]     = useState<RecentJob[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterFav,   setFilterFav]   = useState(false)
  const [activeCol,   setActiveCol]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const cols = await window.electron.workspace.listCollections()
        setCollections(cols)
        const jobs: RecentJob[] = []
        for (const col of cols) {
          const colJobs = await window.electron.workspace.listJobs(col) as any[]
          for (const job of colJobs) {
            jobs.push({
              filename:   job.filename ?? String(job),
              collection: col,
              url:        job.url,
              createdAt:  job.createdAt,
            })
          }
        }
        jobs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        setAllJobs(jobs)
      } catch { /* workspace not ready */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const visibleJobs = allJobs.filter((job) => {
    const key = `${job.collection}/${job.filename}`
    if (filterFav && !isFav(key)) return false
    if (activeCol && job.collection !== activeCol) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return job.filename.toLowerCase().includes(q) || job.collection.toLowerCase().includes(q)
    }
    return true
  })

  const favCount = allJobs.filter((j) => isFav(`${j.collection}/${j.filename}`)).length

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] relative">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-5xl mx-auto px-8 py-8">

        {/* ── Hero ───────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome to <span className="gradient-text">Modly</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Local AI · open source · runs on your GPU</p>
        </div>

        {/* ── Stats ──────────────────────────────────────────────── */}
        {!loading && allJobs.length > 0 && (
          <div className="flex gap-3 mb-8">
            <StatCard value={allJobs.length}       label="Models generated" />
            <StatCard value={collections.length}   label="Collections" />
            <StatCard value={favCount}             label="Favourites" />
          </div>
        )}

        {/* ── Quick actions ───────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Quick start</p>
          <div className="grid grid-cols-4 gap-3">
            <QuickCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
              title="Image to 3D" desc="Upload a photo"
              accentClass="bg-violet-500/10 border border-violet-500/20 text-violet-400"
              borderHover="hover:border-violet-500/25" onClick={() => navigate('generate')} />
            <QuickCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>}
              title="Text to 3D" desc="Describe an object"
              accentClass="bg-blue-500/10 border border-blue-500/20 text-blue-400"
              borderHover="hover:border-blue-500/25" onClick={() => navigate('generate')} />
            <QuickCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 6h4a4 4 0 014 4v4a4 4 0 01-4 4H7"/></svg>}
              title="Workflows" desc="Chain AI steps"
              accentClass="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              borderHover="hover:border-emerald-500/25" onClick={() => navigate('workflows')} />
            <QuickCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
              title="Extensions" desc="Install AI models"
              accentClass="bg-amber-500/10 border border-amber-500/20 text-amber-400"
              borderHover="hover:border-amber-500/25" onClick={() => navigate('models')} />
          </div>
        </div>

        {/* ── Gallery ─────────────────────────────────────────────── */}
        {!loading && allJobs.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Library</p>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 focus-within:border-zinc-500 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models…"
                  className="flex-1 bg-transparent text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              {/* Favourites filter */}
              <button
                onClick={() => setFilterFav((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  filterFav
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill={filterFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Favourites
              </button>

              {/* Collection tabs */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setActiveCol(null)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${!activeCol ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  All
                </button>
                {collections.map((col) => (
                  <button
                    key={col}
                    onClick={() => setActiveCol(activeCol === col ? null : col)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${activeCol === col ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {visibleJobs.length === 0 ? (
              <div className="flex flex-col items-center py-10 glass rounded-2xl">
                <p className="text-sm text-zinc-500">No models match your filter</p>
                <button onClick={() => { setSearch(''); setFilterFav(false); setActiveCol(null) }} className="mt-2 text-xs text-violet-400 hover:text-violet-300">Clear filters</button>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
                {visibleJobs.map((job, i) => (
                  <ModelCard
                    key={i}
                    job={job}
                    apiUrl={apiUrl}
                    onOpen={() => navigate('generate')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {!loading && allJobs.length === 0 && (
          <div className="mt-4 flex flex-col items-center py-16 glass rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mb-4 text-zinc-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-300">No models yet</p>
            <p className="text-xs text-zinc-600 mt-1 mb-6">Generate your first 3D model to see it here</p>
            <button onClick={() => navigate('generate')} className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold">
              Start generating
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-8 text-zinc-600">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span className="text-sm">Loading workspace…</span>
          </div>
        )}
      </div>
    </div>
  )
}
