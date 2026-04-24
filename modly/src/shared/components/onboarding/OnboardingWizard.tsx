/**
 * First-run onboarding wizard.
 * Shown once when the app launches for the first time.
 * Detects hardware and recommends the right model tier.
 * Persisted via localStorage key "modly_onboarding_done".
 */
import { useEffect, useState } from 'react'
import { useHardware } from '@shared/hooks/useHardware'
import { useNavStore } from '@shared/stores/navStore'

const STORAGE_KEY = 'modly_onboarding_done'

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = 'welcome' | 'hardware' | 'ready'

// ─── Step: Welcome ────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 24L16 8l8 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.5 19h11" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Welcome to Dodai</h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
          Your local AI studio — chat with LLMs and generate 3D models. Everything runs on your GPU, no subscriptions, no cloud.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {[
          { icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', label: 'Chat LLM' },
          { icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18', label: 'Image → 3D' },
          { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Modèles' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 px-3 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
              <path d={icon}/>
            </svg>
            <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <button onClick={onNext} className="btn-gradient w-full max-w-sm py-3 rounded-xl text-sm font-semibold">
        Get started →
      </button>
    </div>
  )
}

// ─── Step: Hardware ───────────────────────────────────────────────────────────

const TIER_INFO = {
  high: {
    color: 'emerald',
    title: 'High-end GPU detected',
    subtitle: 'You can run all models, including Hunyuan3D 2.0 with full PBR textures.',
    recommended: 'Hunyuan3D 2.0',
    badge: '✦ Best quality',
  },
  mid: {
    color: 'blue',
    title: 'Mid-range GPU detected',
    subtitle: 'Most models will run well on your machine.',
    recommended: 'SF3D or Hunyuan3D Turbo',
    badge: '⚡ Good performance',
  },
  low: {
    color: 'amber',
    title: 'Low VRAM detected',
    subtitle: 'Lightweight models like Shap-E will work well.',
    recommended: 'Shap-E',
    badge: '◎ CPU / lightweight',
  },
  none: {
    color: 'zinc',
    title: 'No GPU detected',
    subtitle: 'Generation will run on CPU — expect slower speeds.',
    recommended: 'Shap-E (CPU mode)',
    badge: '◎ CPU mode',
  },
}

function HardwareStep({ onNext, onGoExtensions }: { onNext: () => void; onGoExtensions: () => void }) {
  const { info, loading } = useHardware()
  const tier = info?.recommended_tier ?? 'none'
  const meta = TIER_INFO[tier]

  const borderCls = {
    emerald: 'border-emerald-700/40 bg-emerald-950/20',
    blue:    'border-blue-700/40    bg-blue-950/20',
    amber:   'border-amber-700/40   bg-amber-950/20',
    zinc:    'border-zinc-700/40    bg-zinc-900/40',
  }[meta.color]

  const dotCls = {
    emerald: 'bg-emerald-400',
    blue:    'bg-blue-400',
    amber:   'bg-amber-400',
    zinc:    'bg-zinc-500',
  }[meta.color]

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-100">Your hardware</h2>
        <p className="text-sm text-zinc-500 mt-1">We detected your setup and picked the best model for you.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-violet-400 animate-spin" />
        </div>
      ) : (
        <div className={`flex flex-col gap-4 p-4 rounded-2xl border ${borderCls}`}>
          {/* GPU row */}
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200 truncate">
                {info?.gpu_name ?? 'No GPU'}
              </p>
              {info?.cuda_available && (
                <p className="text-[11px] text-zinc-500">{info.vram_total_gb} GB VRAM · {info.ram_gb} GB RAM</p>
              )}
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-zinc-300 shrink-0">
              {meta.badge}
            </span>
          </div>

          {/* Assessment */}
          <div className="flex flex-col gap-1 pt-3 border-t border-white/5">
            <p className="text-xs font-semibold text-zinc-200">{meta.title}</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{meta.subtitle}</p>
          </div>

          {/* Recommended model */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-700/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-400 shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <div>
              <p className="text-[10px] text-zinc-500">Recommended for you</p>
              <p className="text-xs font-semibold text-zinc-200">{meta.recommended}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={onGoExtensions}
          className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
        >
          Install a model
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700/50"
        >
          Later
        </button>
      </div>
    </div>
  )
}

// ─── Step: Ready ──────────────────────────────────────────────────────────────

function ReadyStep({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-700/40 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-100">You're all set!</h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
          Chat with local LLMs or generate 3D models — everything runs on your GPU.
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
          Go to <span className="text-zinc-300 font-medium">Chat</span> to talk with a local LLM
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          Visit <span className="text-zinc-300 font-medium">Models</span> to download AI models
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          Use <span className="text-zinc-300 font-medium">Generate</span> to create 3D models
        </div>
      </div>

      <button onClick={onDone} className="btn-gradient w-full max-w-xs py-3 rounded-xl text-sm font-semibold">
        Open Dodai
      </button>
    </div>
  )
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

const STEPS: Step[] = ['welcome', 'hardware', 'ready']

export function OnboardingWizard() {
  const navigate    = useNavStore((s) => s.navigate)
  const [step, setStep] = useState<Step>('welcome')
  const stepIdx = STEPS.indexOf(step)

  function next() {
    const nxt = STEPS[stepIdx + 1]
    if (nxt) setStep(nxt)
    else done()
  }

  function done() {
    localStorage.setItem(STORAGE_KEY, '1')
    // Force re-render of parent (see useOnboardingDone)
    window.dispatchEvent(new Event('modly:onboarding-done'))
  }

  function goExtensions() {
    done()
    navigate('models')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Top gradient line */}
        <div className="h-0.5 bg-gradient-to-r from-violet-500 via-blue-500 to-transparent" />

        <div className="px-8 py-8">
          {step === 'welcome'  && <WelcomeStep  onNext={next} />}
          {step === 'hardware' && <HardwareStep onNext={next} onGoExtensions={goExtensions} />}
          {step === 'ready'    && <ReadyStep    onDone={done} />}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 pb-5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`rounded-full transition-all ${
                i === stepIdx
                  ? 'w-5 h-1.5 bg-violet-500'
                  : i < stepIdx
                  ? 'w-1.5 h-1.5 bg-zinc-500'
                  : 'w-1.5 h-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Hook: should we show the wizard? ────────────────────────────────────────

export function useOnboardingRequired(): boolean {
  const [required, setRequired] = useState(() => !localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    function handleDone() { setRequired(false) }
    window.addEventListener('modly:onboarding-done', handleDone)
    return () => window.removeEventListener('modly:onboarding-done', handleDone)
  }, [])

  return required
}
