# Dodai 3D — CLAUDE.md

## Project overview

**Dodai 3D** is a local desktop app (Electron + React + FastAPI) for AI-powered 3D mesh generation from images, with a built-in local LLM chat. Think LM Studio / Ollama but for 3D.

- **Stack**: Electron 33, React 18 + TypeScript, Tailwind CSS 3, Vite, FastAPI (Python)
- **State**: Zustand stores (appStore, navStore, favoritesStore, langStore, extensionsStore, workflowsStore)
- **i18n**: `useT()` hook from `src/shared/i18n/` — EN + FR
- **3D rendering**: React Three Fiber + Three.js
- **Workflows**: @xyflow/react node graph
- **LLM inference**: llama-cpp-python with GGUF models, SSE streaming
- **Repo (main)**: `https://github.com/martinleonardcyber-ops/dodai-3d`
- **Dev branch**: `claude/modly-setup-bRzNa` on `martinleonardcyber-ops/martinleonardcyber-ops`

## Key commands

```bash
cd modly
npm run dev      # Electron + Vite dev server
npm run build    # production build
npm run lint     # ESLint
```

## Branding

- **App name**: Dodai 3D (was "Modly" — fully renamed everywhere)
- **App ID**: `com.dodai3d.app`
- **Tagline**: "Local AI · open source · runs on your GPU"
- **Colors**: bg `#09090b`, accent purple→blue `#8b5cf6 → #3b82f6`
- **CSS**: `.btn-gradient` in `src/styles/globals.css`
- **Design**: zinc palette, glassmorphism (backdrop-blur, rgba bg + borders, ambient orbs)
- **Logo SVG**: `Sidebar.tsx:DodaiLogo` and `FirstRunSetup.tsx:DodaiLogo`

## Repository structure

```
modly/
├── electron/main/
│   ├── index.ts            BrowserWindow bootstrap
│   ├── ipc-handlers.ts     IPC events
│   └── python-bridge.ts    FastAPI subprocess manager (hideConsole on Windows)
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── areas/
│   │   ├── chat/ChatPage.tsx              ← REWRITE PENDING (625 lines, spec below)
│   │   ├── dashboard/DashboardPage.tsx
│   │   ├── generate/
│   │   │   ├── GeneratePage.tsx
│   │   │   └── components/
│   │   │       ├── GenerationHUD.tsx
│   │   │       ├── GenerationOptions.tsx
│   │   │       ├── GenerationPanel.tsx
│   │   │       ├── ImageUpload.tsx
│   │   │       ├── Viewer3D.tsx
│   │   │       ├── ViewerToolbar.tsx
│   │   │       └── WorkflowPanel.tsx
│   │   ├── models/
│   │   │   ├── ModelsPage.tsx
│   │   │   └── components/
│   │   │       ├── LLMHub.tsx             ← REWRITE PENDING
│   │   │       ├── ModelCard.tsx
│   │   │       ├── DownloadingCard.tsx
│   │   │       └── ExtensionCard.tsx
│   │   ├── settings/SettingsPage.tsx
│   │   │   └── components/
│   │   │       ├── AboutSection.tsx
│   │   │       ├── IntegrationsSection.tsx
│   │   │       ├── LogsSection.tsx
│   │   │       ├── PerformanceSection.tsx
│   │   │       └── StorageSection.tsx
│   │   ├── setup/FirstRunSetup.tsx        ← DodaiLogo SVG copy here
│   │   └── workflows/
│   │       ├── WorkflowsPage.tsx
│   │       └── nodes/
│   │           ├── BaseNode.tsx           shared frame
│   │           ├── InputNode.tsx
│   │           ├── TextNode.tsx
│   │           ├── ImageNode.tsx
│   │           ├── LLMNode.tsx            text → local model → text
│   │           ├── HttpNode.tsx           GET/POST with URL + headers
│   │           ├── AddToSceneNode.tsx
│   │           ├── Load3DMeshNode.tsx
│   │           ├── PreviewImageNode.tsx
│   │           ├── ExtensionNode.tsx
│   │           └── WorkflowEdge.tsx       animated gradient edge
│   ├── shared/
│   │   ├── components/layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx               ← DodaiLogo SVG + lang toggle (EN/FR)
│   │   │   └── TopBar.tsx
│   │   ├── components/onboarding/OnboardingWizard.tsx
│   │   ├── components/ui/
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── ErrorModal.tsx
│   │   │   ├── FieldLabel.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   └── UpdateModal.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   ├── useGeneration.ts
│   │   │   └── useHardware.ts
│   │   ├── i18n/
│   │   │   ├── index.ts                  exports useT()
│   │   │   └── translations.ts           full EN + FR (see below)
│   │   ├── router/Router.tsx + routes.tsx
│   │   ├── stores/
│   │   │   ├── appStore.ts               apiUrl
│   │   │   ├── extensionsStore.ts
│   │   │   ├── favoritesStore.ts
│   │   │   ├── langStore.ts              localStorage key: dodai-lang
│   │   │   ├── navStore.ts               Page type + navigate()
│   │   │   └── workflowsStore.ts
│   │   ├── types/collections.ts + electron.d.ts
│   │   └── utils/format.ts
│   └── styles/globals.css               Tailwind + .btn-gradient
├── api/
│   ├── main.py
│   ├── runner.py
│   └── routers/
│       ├── llm.py                        LLM inference + model hub (full code below)
│       ├── hardware.py                   GPU detection 7-method cascade
│       ├── generation.py
│       ├── model.py
│       ├── optimize.py
│       ├── export.py
│       ├── settings.py
│       ├── status.py
│       ├── extensions.py
│       ├── text_generation.py
│       └── workflow_runs.py
│   ├── schemas/generation.py
│   └── services/
│       ├── extension_process.py
│       ├── generator_registry.py
│       └── generators/
└── resources/icons/                      icon.png, .ico, .icns
```

---

## Stores

### navStore
```typescript
type Page = 'dashboard' | 'chat' | 'generate' | 'workflows' | 'models' | 'settings'
const { navigate } = useNavStore()
navigate('models')
```

### appStore
```typescript
const apiUrl = useAppStore((s) => s.apiUrl)  // "http://localhost:8765"
```

### langStore
```typescript
// localStorage key: dodai-lang
// values: 'en' | 'fr'
// Zustand persist
```

---

## i18n — useT() full key tree

```typescript
import { useT } from '@shared/i18n'
const t = useT()
```

All keys (EN values shown):

```
t.nav.dashboard = 'Dashboard'
t.nav.chat = 'Chat'
t.nav.generate = 'Generate'
t.nav.workflows = 'Workflows'
t.nav.models = 'Models'
t.nav.settings = 'Settings'

t.topbar.updateReady = 'Update ready'
t.topbar.restart = 'Restart'

t.dashboard.welcome = 'Welcome to'
t.dashboard.tagline = 'Local AI · open source · runs on your GPU'
t.dashboard.quickStart = 'Quick start'
t.dashboard.imageTo3D = 'Image to 3D'
t.dashboard.textTo3D = 'Text prompt'
t.dashboard.chat = 'Chat'
t.dashboard.workflows = 'Workflows'
t.dashboard.models = 'Models'
t.dashboard.hardware = 'Hardware'
t.dashboard.backendStatus = 'Backend'
t.dashboard.ready = 'Ready' | t.dashboard.offline = 'Offline'
t.dashboard.noGpu = 'No GPU'
t.dashboard.vramUsed = 'VRAM used'
t.dashboard.loadedModel = 'Loaded model'
t.dashboard.noModel = 'No model loaded'

t.chat.title = 'Chat'
t.chat.newChat = 'New chat'
t.chat.systemPrompt = 'System prompt'
t.chat.systemDefault = 'You are a helpful AI assistant.'
t.chat.placeholder = 'Send a message…'
t.chat.send = 'Send'
t.chat.stop = 'Stop'
t.chat.temperature = 'Temperature'
t.chat.contextLength = 'Context'
t.chat.loadingModel = 'Loading model…'
t.chat.thinking = 'Thinking…'
t.chat.you = 'You'
t.chat.assistant = 'Assistant'
t.chat.clearHistory = 'Clear history'
t.chat.params = 'Parameters'
t.chat.copyCode = 'Copy'

t.models.title = 'Models'
t.models.llmTab = 'Language Models'
t.models.threeDTab = '3D Models'
t.models.download = 'Download'
t.models.downloading = 'Downloading…'
t.models.load = 'Load'
t.models.loaded = 'Loaded'
t.models.unload = 'Unload'
t.models.delete = 'Delete'

t.setup.checking = 'Checking environment…'
t.setup.chooseFolder = 'Choose a data folder'
t.setup.installing = 'Setting up environment…'
t.setup.starting = 'Starting backend…'
t.setup.error = 'Something went wrong'
t.setup.retry = 'Retry'

t.settings.about = 'About'
t.settings.docs = 'Documentation'
t.settings.github = 'GitHub'

t.vram.free = 'free'
```

To add a translation key: edit `src/shared/i18n/translations.ts` (both `en` and `fr` objects), same shape.

---

## FastAPI backend — port 8765

### All LLM endpoints

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| GET | `/llm/models` | — | `LlmModelInfo[]` |
| GET | `/llm/status` | — | `{ loaded, model_id }` |
| POST | `/llm/load` | `{ model_id }` | `{ status, model_id }` |
| DELETE | `/llm/unload` | — | `{ status }` |
| POST | `/llm/chat` | `ChatRequest` | SSE stream |
| GET | `/llm/hub/featured` | — | curated model list |
| GET | `/llm/hub/search?q=` | — | HuggingFace results |
| POST | `/llm/hub/download` | `{ repo_id, filename }` | `{ status }` |
| GET | `/llm/hub/download/{filename}/progress` | — | `{ progress, total, done, error }` |
| DELETE | `/llm/hub/download/{filename}` | — | cancel |
| DELETE | `/llm/models/{filename}` | — | delete local file |

### ChatRequest schema (Python)
```python
class ChatRequest(BaseModel):
    model_id:      Optional[str] = None
    messages:      List[ChatMessage]   # [{ role, content }]
    temperature:   float = 0.7
    max_tokens:    int   = 2048
    system_prompt: str   = "You are a helpful AI assistant."
```

### SSE format
```
data: {"token": "..."}\n\n
...
data: [DONE]\n\n
```

### Models directory
`~/dodai-models/` — env var `MODELS_DIR` overrides. Only `.gguf` files scanned.

### TODO in llm.py
`n_ctx` is hardcoded to `4096` in `/llm/load`. Make it accept `n_ctx` from the load request body.

### Hardware endpoints
- `GET /hardware/debug` — JSON with all 7 GPU detection method results

---

## ChatPage.tsx — current state (625 lines)

File: `src/areas/chat/ChatPage.tsx`

### Current components
- `ModelDropdown` — searchable dropdown, green dot = loaded, spinner = loading
- `MessageBubble` — user right-aligned (zinc glass), assistant left with purple avatar icon
- `MessageContent` — splits on ` ``` ``` ` fenced blocks only (NO bold/italic/inline code yet)
- `TypingIndicator` — 3 bouncing dots with purple avatar
- `ChatPage` — main export

### Current state variables
```typescript
const [models, setModels]                 // LlmModel[]
const [modelsLoading, setModelsLoading]   // bool
const [selectedId, setSelectedId]         // string | null
const [loadingModelId, setLoadingModelId] // string | null
const [messages, setMessages]             // Message[]
const [input, setInput]                   // string
const [streaming, setStreaming]           // bool
const [temperature, setTemperature]       // number, 0.7 default
const [contextLength]                     // FROZEN at 4096 — not editable
const [systemPrompt]                      // FROZEN at t.chat.systemDefault — not editable
const [showParams, setShowParams]         // bool, collapsible right panel
```

### Current bugs
- `let msgCounter = 0` at module level — resets on HMR, not UUID-safe
- No conversation persistence (lost on refresh)
- No conversation sidebar
- `contextLength` and `systemPrompt` are `useState` with no setter exposed in UI
- `MessageContent` only handles fenced code blocks

### Working SSE pattern — PRESERVE EXACTLY
```typescript
const response = await fetch(`${apiUrl}/llm/chat`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_id:      selectedId,
    messages:      [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens:    contextLength,
    system_prompt: systemPrompt,
  }),
  signal: abortRef.current.signal,
})
const reader  = response.body.getReader()
const decoder = new TextDecoder()
// loop: read chunks, split on \n, lines starting "data: ", JSON.parse(data).token
```

---

## ChatPage rewrite spec — URGENT TASK

### Data model
```typescript
interface Message {
  id:      string   // crypto.randomUUID()
  role:    'user' | 'assistant'
  content: string
}

interface Conversation {
  id:           string
  title:        string   // auto from first 50 chars of first user msg
  messages:     Message[]
  modelId:      string | null
  systemPrompt: string
  temperature:  number
  contextLength: number  // slider 512–8192, default 4096
  createdAt:    number
  updatedAt:    number
}
```

### localStorage
```typescript
const STORAGE_KEY = 'dodai-chat-conversations'
// load: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
// save: localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
```

### Layout
```
┌─ 260px sidebar ──┬─── main chat ──────────────────────────────┐
│ [+ New chat]     │  TopBar: conv title + ⚙ params toggle       │
│                  ├────────────────────────────────────────────│
│ Today            │  Messages (scrollable, max-w-3xl centered)  │
│  • Conv 1        │   MessageBubble with inline markdown        │
│  • Conv 2        │   hover: copy / regen / edit                │
│ Yesterday        │   TypingIndicator                           │
│  • Conv 3        ├────────────────────────────────────────────│
│ This week        │  InputArea: textarea + ModelDropdown        │
│ Older            │            + send/stop button               │
│                  │                                             │
│                  │  [Params panel 220px right, collapsible]    │
│                  │   systemPrompt textarea                     │
│                  │   temperature slider 0–2                   │
│                  │   contextLength slider 512–8192             │
└──────────────────┴─────────────────────────────────────────────┘
```

### sendMessages signature (avoids stale closure)
```typescript
async function sendMessages(
  convId: string,
  allMessages: Message[],
  params: {
    modelId:      string | null
    temperature:  number
    contextLength: number
    systemPrompt: string
  }
)
```

### Auto-title
```typescript
setConversations(prev => prev.map(c =>
  c.id === convId && c.title === 'New conversation'
    ? { ...c, title: allMessages[0].content.slice(0, 50).trim() }
    : c
))
```

### Markdown renderer (no external lib)
Parse inline: `**bold**` → `<strong>`, `*italic*` → `<em>`, `` `code` `` → `<code className="font-mono text-violet-300 bg-black/30 px-1 rounded">`.
Fenced blocks: language label top-left + copy button top-right.

### Message hover actions
- All messages: copy content button
- Last assistant message: regenerate button (re-sends history minus last assistant msg)
- User messages: inline edit → textarea → confirm → re-trigger stream

### Sidebar grouping (by updatedAt)
Groups: **Today** / **Yesterday** / **This week** / **Older**

### Write strategy (avoid stream timeout)
Write in 2 separate files, then consolidate:
1. `src/areas/chat/chatTypes.ts` — interfaces + STORAGE_KEY + helpers
2. Rewrite `ChatPage.tsx` importing from chatTypes.ts

---

## GPU detection (hardware.py) — 7-method cascade

1. `pynvml` — direct NVML binding
2. `nvidia-smi` subprocess — multiple Windows paths
3. `nvidia-smi` via PowerShell — finds exe anywhere on disk
4. `torch.cuda` — if PyTorch in venv
5. `winreg` — Windows Registry display adapter class
6. `wmic` — WMI CLI
7. `Get-CimInstance` via PowerShell — Windows 11 replacement for wmic

**Debug**: `GET http://localhost:8765/hardware/debug` — paste JSON to diagnose RTX 4060 issue.

---

## Featured models in LLM Hub (llm.py)

8 curated models, all from bartowski/microsoft/google HuggingFace repos:

| Model | Author | Params | Min VRAM | Tags |
|-------|--------|--------|----------|------|
| Llama 3.2 1B | Meta | 1B | 1 GB | lightweight |
| Llama 3.2 3B | Meta | 3B | 2 GB | chat |
| Llama 3.1 8B | Meta | 8B | 6 GB | recommended, coding |
| Phi-3.5 Mini | Microsoft | 3.8B | 3 GB | reasoning |
| Qwen 2.5 7B | Alibaba | 7B | 5 GB | multilingual, français |
| Gemma 2 2B | Google | 2B | 2 GB | chat |
| Mistral 7B v0.3 | Mistral AI | 7B | 5 GB | français, fast |
| DeepSeek R1 8B | DeepSeek | 8B | 6 GB | reasoning, coding |

All use Q4_K_M quantization as default variant. Each has Q8_0 option where available.

---

## Workflows (n8n-style)

Built with `@xyflow/react`. Features:
- "+" hover button on node output → adds connected node
- Right-click context menu: duplicate, delete, add node
- Ctrl+C/V copy-paste, Ctrl+D duplicate, Ctrl+A select all
- MiniMap + Controls panel
- Execution log panel (green/red borders per node after run)

Node types: `InputNode`, `TextNode`, `ImageNode`, `LLMNode`, `HttpNode`, `AddToSceneNode`, `Load3DMeshNode`, `PreviewImageNode`, `ExtensionNode`
Edge: `WorkflowEdge` (animated gradient)

---

## Pending tasks (priority order)

### 1. URGENT — Rewrite ChatPage.tsx
Full spec above. Write in 2 parts to avoid timeout:
- First: `src/areas/chat/chatTypes.ts` (interfaces, helpers, storage utils)
- Then: full `ChatPage.tsx` rewrite importing from chatTypes.ts

### 2. NEXT — Make n_ctx configurable in /llm/load
File: `api/routers/llm.py`
```python
# Change LoadRequest to:
class LoadRequest(BaseModel):
    model_id: str
    n_ctx:    int = 4096

# Then pass req.n_ctx to Llama():
_llm = Llama(model_path=..., n_ctx=req.n_ctx, n_gpu_layers=-1, verbose=False)
```

### 3. NEXT — Rewrite LLMHub.tsx
File: `src/areas/models/components/LLMHub.tsx`
Premium glassmorphism model cards. Add "Start Chat →" button per model that:
1. Navigates to chat page
2. Triggers model load

### 4. FIX — GPU detection RTX 4060 Windows
Check `/hardware/debug`, share JSON output to diagnose.

---

## Vision roadmap

- [x] Model hub with one-click download
- [x] Hardware detection + onboarding wizard
- [x] Local LLM chat (GGUF + llama-cpp-python, SSE streaming)
- [x] n8n-style visual workflow builder
- [x] EN/FR bilingual
- [ ] Chat conversation history + persistence (URGENT)
- [ ] Hardware dashboard (GPU usage, VRAM, temp live)
- [ ] Generation history with 3D preview
- [ ] Batch generation
- [ ] Plugin/extension system (started)
- [ ] REST API for programmatic access
