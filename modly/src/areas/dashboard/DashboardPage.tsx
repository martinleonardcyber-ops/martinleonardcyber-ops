import { useState, useEffect } from 'react'
import { useNavStore } from '@shared/stores/navStore'
import { useAppStore } from '@shared/stores/appStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentJob {
  filename: string
  collection: string
  url?: string
  createdAt?: number
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconImage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconText() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  )
}

function IconMesh() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconWorkflows() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 6h4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7" />
    </svg>
  )
}

function IconExtensions() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickCard({
  icon,
  title,
  desc,
  accentClass,
  borderHover,
  onClick,
}: {
  icon: JSX.Element
  title: string
  desc: string
  accentClass: string
  borderHover: string
  onClick: () => void
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
        <IconArrow />
      </span>
    </button>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Recent model card ────────────────────────────────────────────────────────

function ModelCard({ job, apiUrl, onClick }: { job: RecentJob; apiUrl: string; onClick: () => void }) {
  const name = job.filename.replace(/\.[^.]+$/, '')
  const date = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : null

  return (
    <button
      onClick={onClick}
      className="group flex flex-col glass rounded-xl overflow-hidden text-left hover:border-violet-500/20 hover:scale-[1.02] transition-all duration-200"
    >
      {/* Preview area */}
      <div className="aspect-square bg-gradient-to-br from-zinc-900 to-[#09090b] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-card-glow" />
        <span className="text-zinc-700 group-hover:text-zinc-500 transition-colors relative z-10">
          <IconMesh />
        </span>
      </div>
      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[12px] font-medium text-zinc-200 truncate">{name}</p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[10px] text-zinc-600 truncate">{job.collection}</p>
          {date && <p className="text-[10px] text-zinc-700 shrink-0 ml-2">{date}</p>}
        </div>
      </div>
    </button>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
  const { navigate } = useNavStore()
  const apiUrl = useAppStore((s) => s.apiUrl)
  const [collections, setCollections] = useState<string[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [totalModels, setTotalModels] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const cols = await window.electron.workspace.listCollections()
        setCollections(cols)

        const allJobs: RecentJob[] = []
        for (const col of cols.slice(0, 6)) {
          const jobs = await window.electron.workspace.listJobs(col) as any[]
          for (const job of jobs) {
            allJobs.push({
              filename:   (job as any).filename ?? String(job),
              collection: col,
              url:        (job as any).url,
              createdAt:  (job as any).createdAt,
            })
          }
        }
        allJobs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        setTotalModels(allJobs.length)
        setRecentJobs(allJobs.slice(0, 12))
      } catch {
        // workspace not ready yet (first-run or dev mode)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function openJob(job: RecentJob) {
    if (!job.url) return
    // Navigate to generate and load this mesh
    navigate('generate')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] relative">
      {/* Background radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-8 py-8">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome to{' '}
            <span className="gradient-text">Modly</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Local AI · open source · runs on your GPU
          </p>
        </div>

        {/* ── Stats ────────────────────────────────────────────────── */}
        {!loading && (totalModels > 0 || collections.length > 0) && (
          <div className="flex gap-3 mb-8">
            <StatCard value={totalModels}       label="Models generated" />
            <StatCard value={collections.length} label="Collections" />
          </div>
        )}

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
            Quick start
          </p>
          <div className="grid grid-cols-4 gap-3">
            <QuickCard
              icon={<IconImage />}
              title="Image to 3D"
              desc="Upload a photo"
              accentClass="bg-violet-500/10 border border-violet-500/20 text-violet-400"
              borderHover="hover:border-violet-500/25"
              onClick={() => navigate('generate')}
            />
            <QuickCard
              icon={<IconText />}
              title="Text to 3D"
              desc="Describe an object"
              accentClass="bg-blue-500/10 border border-blue-500/20 text-blue-400"
              borderHover="hover:border-blue-500/25"
              onClick={() => navigate('generate')}
            />
            <QuickCard
              icon={<IconWorkflows />}
              title="Workflows"
              desc="Chain AI steps"
              accentClass="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              borderHover="hover:border-emerald-500/25"
              onClick={() => navigate('workflows')}
            />
            <QuickCard
              icon={<IconExtensions />}
              title="Extensions"
              desc="Install AI models"
              accentClass="bg-amber-500/10 border border-amber-500/20 text-amber-400"
              borderHover="hover:border-amber-500/25"
              onClick={() => navigate('models')}
            />
          </div>
        </div>

        {/* ── Recent models ─────────────────────────────────────────── */}
        {!loading && recentJobs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                Recent models
              </p>
              <button
                onClick={() => navigate('generate')}
                className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
              >
                Open viewer →
              </button>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {recentJobs.map((job, i) => (
                <ModelCard
                  key={i}
                  job={job}
                  apiUrl={apiUrl}
                  onClick={() => openJob(job)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!loading && recentJobs.length === 0 && (
          <div className="mt-4 flex flex-col items-center py-16 glass rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mb-4 text-zinc-700">
              <IconMesh />
            </div>
            <p className="text-sm font-semibold text-zinc-300">No models yet</p>
            <p className="text-xs text-zinc-600 mt-1 mb-6">
              Generate your first 3D model to see it here
            </p>
            <button
              onClick={() => navigate('generate')}
              className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold"
            >
              Start generating
            </button>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-3 py-8 text-zinc-600">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm">Loading workspace…</span>
          </div>
        )}
      </div>
    </div>
  )
}
