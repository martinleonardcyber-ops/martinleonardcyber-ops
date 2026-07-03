import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { useNavStore } from '@shared/stores/navStore'
import { useAppStore } from '@shared/stores/appStore'
import { useFavoritesStore } from '@shared/stores/favoritesStore'
import { useT } from '@shared/i18n'
import { useHardware } from '@shared/hooks/useHardware'
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
    <Canvas camera={{ fov: 40, position: [0, 0.5, 2.5] }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <GLBScene url={url} />
        <OrbitControls autoRotate autoRotateSpeed={3} enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={(Math.PI * 3) / 4} />
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
      const resp = await axios.get(`${apiUrl}/export/${fmt}`, { params: { path: relPath }, responseType: 'blob' })
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
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#52525b' }}
        title="Export"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 w-28 rounded-xl overflow-hidden shadow-xl z-50"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)' }}>
          {EXPORT_FORMATS.map(({ fmt, label, mime }) => (
            <button
              key={fmt}
              onClick={(e) => { e.stopPropagation(); download(fmt, mime) }}
              disabled={!!busy}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
            >
              <span>{label}</span>
              {busy === fmt
                ? <div className="w-2.5 h-2.5 rounded-full border border-zinc-500 border-t-zinc-200 animate-spin" />
                : <span className="text-zinc-600 font-mono text-[9px]">.{fmt}</span>
              }
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Model card ───────────────────────────────────────────────────────────────

function ModelCard({ job, apiUrl, onOpen }: { job: RecentJob; apiUrl: string; onOpen: () => void }) {
  const key            = `${job.collection}/${job.filename}`
  const { toggle, isFav } = useFavoritesStore()
  const fav            = isFav(key)
  const name           = job.filename.replace(/\.[^.]+$/, '')
  const date           = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : null
  const fullUrl        = job.url ? `${apiUrl}${job.url}` : null
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.025]"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
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
          <div className="w-full h-full flex items-center justify-center text-zinc-800 group-hover:text-zinc-600 transition-colors relative z-10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => { e.stopPropagation(); toggle(key) }}
            className="p-1.5 rounded-lg border transition-colors"
            style={fav
              ? { background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }
              : { background: 'rgba(9,9,11,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#52525b' }
            }
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
        <p className="text-[12px] font-semibold text-zinc-200 truncate">{name}</p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[10px] text-zinc-600 truncate">{job.collection}</p>
          {date && <p className="text-[10px] text-zinc-700 shrink-0 ml-2">{date}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickCard({ icon, title, desc, gradient, onClick }: {
  icon: JSX.Element
  title: string
  desc: string
  gradient: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
        style={{ background: gradient, boxShadow: `0 4px 16px ${gradient.includes('139,92') ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)'}` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
      </div>
      <span className="self-end text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    </button>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      className="flex flex-col gap-1 px-5 py-4 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-2xl font-bold gradient-text leading-none">{value}</p>
      <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
    </div>
  )
}

// ─── Hardware command card ────────────────────────────────────────────────────

function HardwareCard({ t }: { t: ReturnType<typeof useT> }) {
  const { info, loading } = useHardware(6000)
  const apiUrl = useAppStore((s) => s.apiUrl)
  const [backendReady, setBackendReady] = useState(false)
  const [loadedModel,  setLoadedModel]  = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        await axios.get(`${apiUrl}/health`, { timeout: 1500 })
        if (active) setBackendReady(true)
        try {
          const { data } = await axios.get(`${apiUrl}/llm/status`, { timeout: 1500 })
          if (active) setLoadedModel(data.model_id ?? null)
        } catch { /* no LLM route yet */ }
      } catch {
        if (active) setBackendReady(false)
      }
      if (active) setTimeout(poll, 5000)
    }
    poll()
    return () => { active = false }
  }, [apiUrl])

  const tierColor = {
    none: { bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.2)', text: '#71717a', dot: '#71717a' },
    low:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', text: '#fbbf24', dot: '#fbbf24' },
    mid:  { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.18)', text: '#60a5fa', dot: '#60a5fa' },
    high: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)', text: '#34d399', dot: '#34d399' },
  }
  const tier      = info?.recommended_tier ?? 'none'
  const tc        = tierColor[tier]
  const vramUsed  = info ? info.vram_total_gb - info.vram_free_gb : 0
  const vramPct   = info && info.vram_total_gb > 0 ? (vramUsed / info.vram_total_gb) * 100 : 0
  const vramColor = vramPct > 85 ? '#f87171' : vramPct > 65 ? '#fbbf24' : '#34d399'

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t.dashboard.hardware}</p>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: tc.dot }} />
          {info?.recommended_tier_label ?? (loading ? '…' : t.dashboard.noGpu)}
        </div>
      </div>

      {/* GPU row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-zinc-600 shrink-0">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>
            <path d="M6 2v4M18 2v4M6 18v4M18 18v4"/>
          </svg>
          <p className="text-[12px] font-semibold text-zinc-200 truncate">
            {loading ? '—' : (info?.gpu_name ?? t.dashboard.noGpu)}
          </p>
        </div>

        {info?.cuda_available && info.vram_total_gb > 0 && (
          <div className="flex flex-col gap-1.5 pl-4">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-600">{t.dashboard.vramUsed}</span>
              <span className="font-mono" style={{ color: vramColor }}>
                {vramUsed.toFixed(1)} / {info.vram_total_gb} GB
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${vramPct}%`, background: `linear-gradient(90deg, ${vramColor}99, ${vramColor})` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CPU row */}
      {info?.cpu_name && (
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-zinc-600 shrink-0">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="9" y="9" width="6" height="6"/>
            <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>
          </svg>
          <p className="text-[11px] text-zinc-500 truncate">{info.cpu_name}</p>
          {info.ram_gb > 0 && <span className="text-[10px] font-mono text-zinc-700 shrink-0">{info.ram_gb} GB RAM</span>}
        </div>
      )}

      {/* Backend + model status */}
      <div
        className="flex items-center justify-between pt-3 mt-1"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: backendReady ? '#34d399' : '#f87171',
              boxShadow: backendReady ? '0 0 6px rgba(52,211,153,0.7)' : '0 0 6px rgba(248,113,113,0.7)',
            }}
          />
          <span className="text-[10px] text-zinc-500">{t.dashboard.backendStatus}</span>
          <span className="text-[10px] font-semibold" style={{ color: backendReady ? '#34d399' : '#f87171' }}>
            {backendReady ? t.dashboard.ready : t.dashboard.offline}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-600">{t.dashboard.loadedModel}:</span>
          <span className="text-[10px] font-medium text-zinc-400 truncate max-w-28">
            {loadedModel
              ? loadedModel.split('/').pop()?.replace(/\.gguf$/i, '') ?? loadedModel
              : t.dashboard.noModel}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
  const { navigate }  = useNavStore()
  const apiUrl        = useAppStore((s) => s.apiUrl)
  const { isFav }     = useFavoritesStore()
  const t             = useT()

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
            jobs.push({ filename: job.filename ?? String(job), collection: col, url: job.url, createdAt: job.createdAt })
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
    <div className="flex-1 overflow-y-auto relative" style={{ background: '#09090b' }}>

      {/* Background orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
        width: 800, height: 400,
        background: 'radial-gradient(ellipse at 50% -10%, rgba(139,92,246,0.09) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)',
      }} />
      <div className="absolute top-20 right-0 pointer-events-none" style={{
        width: 300, height: 300,
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      <div className="relative max-w-5xl mx-auto px-8 py-8">

        {/* ── Hero ───────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-2">
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              boxShadow: '0 0 8px rgba(139,92,246,0.8)',
            }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Dodai</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {t.dashboard.welcome} <span className="gradient-text">Dodai</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-1.5 font-medium">{t.dashboard.tagline}</p>
        </div>

        {/* ── Command center row ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          <div className="col-span-2">
            <HardwareCard t={t} />
          </div>
          <div className="flex flex-col gap-3">
            <StatCard value={allJobs.length}     label={t.dashboard.modelsGenerated} />
            <StatCard value={collections.length} label={t.dashboard.collections} />
            <StatCard value={favCount}           label={t.dashboard.favCount} />
          </div>
        </div>

        {/* ── Quick actions ───────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">{t.dashboard.quickStart}</p>
          <div className="grid grid-cols-4 gap-3">
            <QuickCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
              title={t.dashboard.chat}
              desc={t.dashboard.chatDesc}
              gradient="linear-gradient(135deg, rgba(139,92,246,0.85), rgba(109,40,217,0.85))"
              onClick={() => navigate('chat')}
            />
            <QuickCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
              title={t.dashboard.imageTo3D}
              desc={t.dashboard.imageTo3DDesc}
              gradient="linear-gradient(135deg, rgba(59,130,246,0.85), rgba(37,99,235,0.85))"
              onClick={() => navigate('generate')}
            />
            <QuickCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 6h4a4 4 0 014 4v4a4 4 0 01-4 4H7"/></svg>}
              title={t.dashboard.workflows}
              desc={t.dashboard.workflowsDesc}
              gradient="linear-gradient(135deg, rgba(16,185,129,0.85), rgba(5,150,105,0.85))"
              onClick={() => navigate('workflows')}
            />
            <QuickCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
              title={t.dashboard.models}
              desc={t.dashboard.modelsDesc}
              gradient="linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.85))"
              onClick={() => navigate('models')}
            />
          </div>
        </div>

        {/* ── Gallery ─────────────────────────────────────────────── */}
        {!loading && allJobs.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t.dashboard.library}</p>

              {/* Search */}
              <div
                className="flex items-center gap-2 flex-1 max-w-xs px-3 py-1.5 rounded-xl focus-within:border-zinc-600 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-700 shrink-0">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.dashboard.search}
                  className="flex-1 bg-transparent text-[11px] text-zinc-200 placeholder-zinc-700 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-zinc-700 hover:text-zinc-400">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              {/* Favourites filter */}
              <button
                onClick={() => setFilterFav((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all"
                style={filterFav
                  ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }
                }
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill={filterFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {t.dashboard.favourites}
              </button>

              {/* Collection tabs */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setActiveCol(null)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                  style={!activeCol ? { background: 'rgba(255,255,255,0.08)', color: '#e4e4e7' } : { color: '#52525b' }}
                >
                  {t.dashboard.all}
                </button>
                {collections.map((col) => (
                  <button
                    key={col}
                    onClick={() => setActiveCol(activeCol === col ? null : col)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                    style={activeCol === col ? { background: 'rgba(255,255,255,0.08)', color: '#e4e4e7' } : { color: '#52525b' }}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {visibleJobs.length === 0 ? (
              <div className="flex flex-col items-center py-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm text-zinc-500">{t.dashboard.noMatch}</p>
                <button onClick={() => { setSearch(''); setFilterFav(false); setActiveCol(null) }} className="mt-2 text-xs text-violet-400 hover:text-violet-300">
                  {t.dashboard.clearFilters}
                </button>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
                {visibleJobs.map((job, i) => (
                  <ModelCard key={i} job={job} apiUrl={apiUrl} onOpen={() => navigate('generate')} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {!loading && allJobs.length === 0 && (
          <div className="mt-4 flex flex-col items-center py-20 rounded-3xl" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.25" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-300">{t.dashboard.noModels}</p>
            <p className="text-xs text-zinc-600 mt-1 mb-6 text-center max-w-xs">{t.dashboard.noModelsDesc}</p>
            <button
              onClick={() => navigate('generate')}
              className="px-6 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold"
            >
              {t.dashboard.startGenerating}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-8 text-zinc-700">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span className="text-sm">{t.dashboard.loading}</span>
          </div>
        )}
      </div>
    </div>
  )
}
