import { useEffect, useRef, useState } from 'react'
import { useGeneration } from '@shared/hooks/useGeneration'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function GenerationHUD(): JSX.Element | null {
  const { currentJob, reset } = useGeneration()
  const [elapsed, setElapsed] = useState(0)
  const [tqdmLog, setTqdmLog] = useState<string | null>(null)
  const [copied, setCopied]   = useState(false)
  const copyTimeout           = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopyError(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    if (copyTimeout.current) clearTimeout(copyTimeout.current)
    copyTimeout.current = setTimeout(() => setCopied(false), 2000)
  }

  const status    = currentJob?.status
  const isActive  = status === 'uploading' || status === 'generating'
  const isVisible = status === 'uploading' || status === 'generating' || status === 'error'

  useEffect(() => {
    if (isActive && currentJob?.createdAt) {
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - currentJob.createdAt) / 1000))
      }, 1000)
      return () => clearInterval(id)
    } else {
      setElapsed(0)
    }
  }, [isActive, currentJob?.createdAt])

  useEffect(() => {
    if (isActive) {
      setTqdmLog(null)
      window.electron.python.onLog((line) => setTqdmLog(line))
      return () => { window.electron.python.offLog(); setTqdmLog(null) }
    }
  }, [isActive])

  if (!currentJob || !isVisible) return null

  const { progress, step, error } = currentJob

  return (
    <div className="absolute bottom-8 left-1/2 animate-slide-up z-20 w-[400px] pointer-events-auto">
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(12,12,14,0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Generating */}
        {isActive && (
          <div className="px-5 py-4 flex flex-col gap-3">
            {/* Status line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                </span>
                <span className="text-sm font-medium text-zinc-100">
                  {step ?? (status === 'uploading' ? 'Reading image…' : 'Generating 3D mesh…')}
                </span>
              </div>
              <span className="text-xs tabular-nums text-zinc-600 font-mono">{formatElapsed(elapsed)}</span>
            </div>

            {/* Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className="relative h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                {/* Track shimmer */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.4) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s linear infinite',
                  }}
                />
                {/* Fill */}
                <div
                  className="relative h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                    boxShadow: '0 0 10px rgba(124,58,237,0.5)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {tqdmLog && (
                  <span className="text-[10px] text-zinc-600 truncate font-mono">{tqdmLog}</span>
                )}
                <span className="text-[11px] text-zinc-600 tabular-nums shrink-0 ml-auto">{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="px-5 py-4 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-red-400">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-zinc-100">Generation failed</span>
            </div>

            <p className="text-xs text-red-400/90 bg-red-950/30 border border-red-900/30 rounded-xl px-3 py-2.5 max-h-24 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
              {error}
            </p>

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
              >
                Try again
              </button>
              {error && (
                <button
                  onClick={() => handleCopyError(error)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-emerald-400 text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
