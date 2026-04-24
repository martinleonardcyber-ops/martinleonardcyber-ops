import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAppStore } from '@shared/stores/appStore'
import { useNavStore } from '@shared/stores/navStore'
import { useT } from '@shared/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LlmModel {
  id:         string
  name:       string
  size_gb:    number
  parameters: string
  quantization: string
  loaded:     boolean
}

interface Message {
  role:    'user' | 'assistant'
  content: string
  id:      number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(gb: number) {
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(gb * 1024).toFixed(0)} MB`
}

// ─── Model selector panel ─────────────────────────────────────────────────────

// ─── Model avatar ─────────────────────────────────────────────────────────────

const MODEL_COLORS: Record<string, [string, string]> = {
  llama:   ['#8b5cf6', '#6d28d9'],
  mistral: ['#f59e0b', '#d97706'],
  qwen:    ['#3b82f6', '#1d4ed8'],
  gemma:   ['#10b981', '#059669'],
  phi:     ['#06b6d4', '#0891b2'],
  deepseek:['#f97316', '#ea580c'],
  default: ['#6366f1', '#4338ca'],
}

function modelColor(name: string): [string, string] {
  const lower = name.toLowerCase()
  for (const [key, colors] of Object.entries(MODEL_COLORS)) {
    if (lower.includes(key)) return colors
  }
  return MODEL_COLORS.default
}

function ModelAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const [from, to] = modelColor(name)
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-xl font-bold text-white"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: size * 0.33,
        boxShadow: `0 4px 12px ${from}40`,
      }}
    >
      {initials}
    </div>
  )
}

// ─── Model panel ──────────────────────────────────────────────────────────────

function ModelPanel({
  models,
  selectedId,
  loadingModelId,
  onSelect,
  loading,
  t,
  onGoModels,
}: {
  models: LlmModel[]
  selectedId: string | null
  loadingModelId: string | null
  onSelect: (id: string) => void
  loading: boolean
  t: ReturnType<typeof useT>
  onGoModels: () => void
}) {
  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: 256,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(9,9,11,0.6)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{t.chat.modelSelect}</p>
        <button
          onClick={onGoModels}
          title="Télécharger des modèles"
          className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-1.5">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-zinc-500 animate-spin" />
          </div>
        )}

        {!loading && models.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-300 mb-1">{t.chat.noModels}</p>
              <p className="text-[11px] text-zinc-600 leading-relaxed mb-3">Téléchargez un modèle GGUF pour commencer</p>
              <button onClick={onGoModels} className="text-[11px] font-semibold px-4 py-2 rounded-lg btn-gradient text-white">
                {t.chat.goToModels}
              </button>
            </div>
          </div>
        )}

        {models.map((m) => {
          const isSelected = selectedId === m.id
          const isLoading  = loadingModelId === m.id
          const [accentFrom] = modelColor(m.name)

          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              disabled={isLoading}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group disabled:cursor-wait"
              style={isSelected ? {
                background: `linear-gradient(135deg, ${accentFrom}18 0%, rgba(59,130,246,0.06) 100%)`,
                border: `1px solid ${accentFrom}35`,
              } : {
                background: 'transparent',
                border: '1px solid transparent',
              }}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <ModelAvatar name={m.name} size={38} />
                {m.loaded && !isLoading && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950"
                    style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.7)' }}
                  />
                )}
                {isLoading && (
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(9,9,11,0.7)' }}>
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-violet-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-semibold truncate leading-tight ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-white'} transition-colors`}>
                  {m.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                    {m.quantization}
                  </span>
                  <span className="text-[10px] text-zinc-600">{formatBytes(m.size_gb)}</span>
                  {m.parameters && m.parameters !== '?' && (
                    <span className="text-[10px] text-zinc-700">{m.parameters}</span>
                  )}
                </div>
              </div>

              {/* Active indicator */}
              {isSelected && !isLoading && (
                <div className="shrink-0 w-1.5 h-6 rounded-full" style={{ background: `${accentFrom}` }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, t }: { msg: Message; t: ReturnType<typeof useT> }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[72%] px-4 py-3 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(59,130,246,0.18) 100%)',
            border: '1px solid rgba(139,92,246,0.22)',
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-4">
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div
        className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed text-zinc-200"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <MessageContent content={msg.content} />
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3).split('\n')
          const lang = lines[0].trim()
          const code = lines.slice(1).join('\n').replace(/```$/, '').trim()
          return (
            <div key={i} className="my-2 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {lang && (
                <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] font-mono text-zinc-500">{lang}</span>
                </div>
              )}
              <pre className="px-3 py-2.5 text-[11px] text-zinc-300 overflow-x-auto font-mono leading-relaxed">{code}</pre>
            </div>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Params sidebar ───────────────────────────────────────────────────────────

function ParamsPanel({
  temperature,
  setTemperature,
  contextLength,
  setContextLength,
  systemPrompt,
  setSystemPrompt,
  t,
}: {
  temperature: number
  setTemperature: (v: number) => void
  contextLength: number
  setContextLength: (v: number) => void
  systemPrompt: string
  setSystemPrompt: (v: string) => void
  t: ReturnType<typeof useT>
}) {
  return (
    <div
      className="flex flex-col shrink-0 px-4 py-5 gap-5 overflow-y-auto"
      style={{
        width: 220,
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(9,9,11,0.5)',
      }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{t.chat.params}</p>

      {/* Temperature */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-zinc-400">{t.chat.temperature}</label>
          <span className="text-[11px] font-mono text-violet-400">{temperature.toFixed(2)}</span>
        </div>
        <input
          type="range" min="0" max="2" step="0.01"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#8b5cf6' }}
        />
        <div className="flex justify-between text-[9px] text-zinc-700">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Context length */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-zinc-400">{t.chat.contextLength}</label>
          <span className="text-[11px] font-mono text-violet-400">{contextLength.toLocaleString()}</span>
        </div>
        <input
          type="range" min="512" max="32768" step="512"
          value={contextLength}
          onChange={(e) => setContextLength(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#8b5cf6' }}
        />
        <div className="flex justify-between text-[9px] text-zinc-700">
          <span>512</span>
          <span>32k</span>
        </div>
      </div>

      {/* System prompt */}
      <div className="flex flex-col gap-2 flex-1">
        <label className="text-[11px] font-medium text-zinc-400">{t.chat.systemPrompt}</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          className="input-field text-[11px] px-3 py-2 resize-none leading-relaxed flex-1"
          style={{ minHeight: 100 }}
        />
      </div>
    </div>
  )
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────

let msgCounter = 0

export default function ChatPage(): JSX.Element {
  const apiUrl  = useAppStore((s) => s.apiUrl)
  const t       = useT()
  const { navigate } = useNavStore()

  const [models,         setModels]         = useState<LlmModel[]>([])
  const [modelsLoading,  setModelsLoading]  = useState(true)
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [loadingModel,   setLoadingModel]   = useState(false)
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null)

  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)

  const [temperature,   setTemperature]   = useState(0.7)
  const [contextLength, setContextLength] = useState(4096)
  const [systemPrompt,  setSystemPrompt]  = useState(t.chat.systemDefault)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const abortRef     = useRef<AbortController | null>(null)

  // Load model list
  useEffect(() => {
    axios.get(`${apiUrl}/llm/models`)
      .then((r) => {
        setModels(r.data)
        const loaded = r.data.find((m: LlmModel) => m.loaded)
        if (loaded) setSelectedId(loaded.id)
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false))
  }, [apiUrl])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSelectModel(id: string) {
    if (id === selectedId) return
    setLoadingModel(true)
    setLoadingModelId(id)
    setSelectedId(id)
    try {
      await axios.post(`${apiUrl}/llm/load`, { model_id: id })
    } catch { /* ignore */ } finally {
      setLoadingModel(false)
      setLoadingModelId(null)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text, id: ++msgCounter }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    const assistantId = ++msgCounter
    setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantId }])
    setStreaming(true)

    abortRef.current = new AbortController()

    try {
      const response = await fetch(`${apiUrl}/llm/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id:      selectedId,
          messages:      [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          temperature,
          max_tokens:    contextLength,
          system_prompt: systemPrompt,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.body) throw new Error('No response body')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const token  = parsed.token ?? parsed.text ?? parsed.content ?? ''
              if (token) {
                accumulated += token
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
                )
              }
            } catch { /* partial JSON */ }
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: '_(Error: backend not responding. Is a model loaded?)_' } : m)
        )
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleNewChat() {
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
  }

  const canSend = !!selectedId && !!input.trim() && !streaming && !loadingModel

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: '#09090b' }}>

      {/* ── Model selector ─────────────────────────────────────── */}
      <ModelPanel
        models={models}
        selectedId={selectedId}
        loadingModelId={loadingModelId}
        onSelect={handleSelectModel}
        loading={modelsLoading}
        t={t}
        onGoModels={() => navigate('models')}
      />

      {/* ── Chat area ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden relative">

        {/* Header bar */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-3">
            {loadingModel ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                {t.chat.loadingModel}
              </div>
            ) : selectedId ? (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.7)' }} />
                <span className="text-[12px] font-semibold text-zinc-300">
                  {models.find((m) => m.id === selectedId)?.name ?? selectedId}
                </span>
              </div>
            ) : (
              <span className="text-[12px] text-zinc-600">{t.chat.modelSelect}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t.chat.newChat}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.08)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-300">{t.chat.title}</p>
                <p className="text-xs text-zinc-600 mt-1">{t.chat.subtitle}</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} t={t} />
          ))}

          {streaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-3 mb-4">
              <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="flex items-center gap-1 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-5 pb-5 pt-2">
          <div
            className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-150 focus-within:border-violet-500/30"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={selectedId ? t.chat.placeholder : t.chat.modelSelect}
              disabled={!selectedId || loadingModel}
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
              style={{ maxHeight: 160 }}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 btn-gradient disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            )}
          </div>
          <p className="text-[10px] text-zinc-700 text-center mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* ── Parameters panel ───────────────────────────────────── */}
      <ParamsPanel
        temperature={temperature}
        setTemperature={setTemperature}
        contextLength={contextLength}
        setContextLength={setContextLength}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        t={t}
      />
    </div>
  )
}
