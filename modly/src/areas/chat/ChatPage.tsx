import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAppStore } from '@shared/stores/appStore'
import { useNavStore } from '@shared/stores/navStore'
import { useT } from '@shared/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LlmModel {
  id:           string
  name:         string
  size_gb:      number
  parameters:   string
  quantization: string
  loaded:       boolean
}

interface Message {
  role:    'user' | 'assistant'
  content: string
  id:      number
}

// ─── Model dropdown ───────────────────────────────────────────────────────────

function ModelDropdown({
  models,
  selectedId,
  loadingModelId,
  onSelect,
  onGoModels,
}: {
  models:         LlmModel[]
  selectedId:     string | null
  loadingModelId: string | null
  onSelect:       (id: string) => void
  onGoModels:     () => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = models.find((m) => m.id === selectedId)
  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all"
        style={{
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: selected ? '#e4e4e7' : '#52525b',
        }}
      >
        <span className="max-w-[140px] truncate">
          {selected ? selected.name : 'Select model'}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl overflow-hidden z-50"
          style={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find model…"
                className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Model list */}
          <div className="overflow-y-auto pb-2" style={{ maxHeight: 300 }}>
            {filtered.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[12px] text-zinc-600">Aucun modèle trouvé</p>
                <button
                  onClick={() => { setOpen(false); onGoModels() }}
                  className="mt-2 text-[11px] text-violet-400 hover:text-violet-300"
                >
                  Télécharger des modèles →
                </button>
              </div>
            ) : (
              filtered.map((m) => {
                const isSelected = m.id === selectedId
                const isLoading  = loadingModelId === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => { onSelect(m.id); setOpen(false); setSearch('') }}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 disabled:cursor-wait"
                    style={isSelected ? { background: 'rgba(139,92,246,0.08)' } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-zinc-200 truncate font-medium">{m.name}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                        {m.quantization} · {m.size_gb >= 1 ? `${m.size_gb.toFixed(1)} GB` : `${(m.size_gb * 1024).toFixed(0)} MB`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isLoading ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-700 border-t-violet-400 animate-spin" />
                      ) : m.loaded ? (
                        <span
                          className="block w-2 h-2 rounded-full"
                          style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
                        />
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-700">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {models.length > 0 && (
            <div className="px-4 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => { setOpen(false); onGoModels() }}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Télécharger d'autres modèles
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed text-white"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-6">
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0 text-[13px] leading-relaxed text-zinc-200 pt-1">
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
          const lang  = lines[0].trim()
          const code  = lines.slice(1).join('\n').replace(/```$/, '').trim()
          return (
            <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {lang && (
                <div className="px-4 py-2 border-b text-[10px] font-mono text-zinc-500" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {lang}
                </div>
              )}
              <pre className="px-4 py-3 text-[11px] text-zinc-300 overflow-x-auto font-mono leading-relaxed">{code}</pre>
            </div>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-6">
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────

let msgCounter = 0

export default function ChatPage(): JSX.Element {
  const apiUrl        = useAppStore((s) => s.apiUrl)
  const t             = useT()
  const { navigate }  = useNavStore()

  const [models,         setModels]         = useState<LlmModel[]>([])
  const [modelsLoading,  setModelsLoading]  = useState(true)
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null)

  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)

  const [temperature,  setTemperature]  = useState(0.7)
  const [contextLength]                 = useState(4096)
  const [systemPrompt]                  = useState(t.chat.systemDefault)
  const [showParams,   setShowParams]   = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!apiUrl) return
    axios.get(`${apiUrl}/llm/models`)
      .then((r) => {
        setModels(r.data)
        const loaded = r.data.find((m: LlmModel) => m.loaded)
        if (loaded) setSelectedId(loaded.id)
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false))
  }, [apiUrl])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSelectModel(id: string) {
    if (id === selectedId && models.find((m) => m.id === id)?.loaded) return
    setLoadingModelId(id)
    setSelectedId(id)
    try {
      await axios.post(`${apiUrl}/llm/load`, { model_id: id })
      setModels((prev) => prev.map((m) => ({ ...m, loaded: m.id === id })))
    } catch { /* ignore */ } finally {
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
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const token = JSON.parse(data).token ?? ''
            if (token) {
              accumulated += token
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
              )
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: '_Erreur : le backend ne répond pas. Un modèle est-il chargé ?_' } : m
          )
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
    inputRef.current?.focus()
  }

  const isLoadingAny = loadingModelId !== null
  const canSend      = !!selectedId && !isLoadingAny && !!input.trim() && !streaming

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: '#09090b' }}>

      {/* ── Main chat column ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t.chat.newChat}
              </button>
            )}
          </div>

          <button
            onClick={() => setShowParams((v) => !v)}
            title="Paramètres"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showParams ? 'text-violet-400 bg-violet-900/20' : 'text-zinc-600 hover:text-zinc-300'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              {/* Dodai logo mark */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))',
                  border: '1px solid rgba(139,92,246,0.2)',
                  boxShadow: '0 0 48px rgba(139,92,246,0.08)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round">
                  <defs>
                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a78bfa"/>
                      <stop offset="100%" stopColor="#60a5fa"/>
                    </linearGradient>
                  </defs>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-300">Comment puis-je vous aider ?</p>
                {!modelsLoading && models.length === 0 && (
                  <p className="text-[12px] text-zinc-600 mt-1.5">
                    Aucun modèle téléchargé —{' '}
                    <button onClick={() => navigate('models')} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                      télécharger un modèle
                    </button>
                  </p>
                )}
                {!modelsLoading && models.length > 0 && !selectedId && (
                  <p className="text-[12px] text-zinc-600 mt-1.5">Sélectionnez un modèle ci-dessous</p>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-6 py-8">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {streaming && messages[messages.length - 1]?.content === '' && (
                <TypingIndicator />
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 pb-5 pt-2">
          <div className="max-w-3xl mx-auto w-full">
            <div
              className="rounded-2xl transition-all duration-150 focus-within:border-zinc-600"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
              }}
            >
              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Send a message"
                disabled={!selectedId || isLoadingAny}
                rows={1}
                className="w-full bg-transparent px-4 pt-4 pb-2 text-[13px] text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
                style={{ maxHeight: 180 }}
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 pb-3 pt-1">
                {/* Left: attach / extras */}
                <button
                  onClick={() => navigate('models')}
                  title="Télécharger des modèles"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>

                {/* Right: model picker + send */}
                <div className="flex items-center gap-2">
                  {modelsLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-800 border-t-zinc-600 animate-spin" />
                  ) : (
                    <ModelDropdown
                      models={models}
                      selectedId={selectedId}
                      loadingModelId={loadingModelId}
                      onSelect={handleSelectModel}
                      onGoModels={() => navigate('models')}
                    />
                  )}

                  {streaming ? (
                    <button
                      onClick={handleStop}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!canSend}
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all btn-gradient disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-700 text-center mt-2">Entrée pour envoyer · Maj+Entrée pour sauter une ligne</p>
          </div>
        </div>
      </div>

      {/* ── Params panel (collapsible) ──────────────────────────── */}
      {showParams && (
        <div
          className="flex flex-col shrink-0 px-4 py-5 gap-5 overflow-y-auto"
          style={{
            width: 220,
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(9,9,11,0.5)',
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{t.chat.params}</p>

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
              <span>Précis</span><span>Créatif</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
