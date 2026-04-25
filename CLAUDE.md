# Dodai 3D — CLAUDE.md

## Project overview

**Dodai 3D** is a local, open-source desktop app (Electron + React + FastAPI) for AI-powered 3D mesh generation from images, with a built-in local LLM chat. Think LM Studio / Ollama but for 3D — simple, professional, GPU-accelerated.

- **Stack**: Electron 33, React 18 + TypeScript, Tailwind CSS 3, Vite, FastAPI (Python)
- **State**: Zustand stores (appStore, navStore, favoritesStore, langStore, extensionsStore, workflowsStore)
- **i18n**: Custom hook `useT()` from `src/shared/i18n/` — EN + FR supported
- **3D rendering**: React Three Fiber + Three.js
- **Workflows**: @xyflow/react node graph
- **LLM inference**: llama-cpp-python with GGUF models, SSE streaming

## Dev branch

All work goes on: `claude/modly-setup-bRzNa`

## Repository structure

```
modly/
├── electron/
│   └── main/
│       ├── index.ts            app bootstrap, BrowserWindow
│       ├── ipc-handlers.ts     IPC events
│       └── python-bridge.ts    manages FastAPI subprocess
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── areas/
│   │   ├── chat/
│   │   │   └── ChatPage.tsx        ← MAIN ACTIVE FILE (rewrite pending)
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
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
│   │   │       ├── LLMHub.tsx          ← planned rewrite
│   │   │       ├── ModelCard.tsx
│   │   │       ├── DownloadingCard.tsx
│   │   │       └── ExtensionCard.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx
│   │   │   └── components/
│   │   │       ├── AboutSection.tsx
│   │   │       ├── IntegrationsSection.tsx
│   │   │       ├── LogsSection.tsx
│   │   │       ├── PerformanceSection.tsx
│   │   │       └── StorageSection.tsx
│   │   ├── setup/
│   │   │   └── FirstRunSetup.tsx
│   │   └── workflows/
│   │       ├── WorkflowsPage.tsx
│   │       └── nodes/
│   │           ├── BaseNode.tsx
│   │           ├── InputNode.tsx
│   │           ├── TextNode.tsx
│   │           ├── ImageNode.tsx
│   │           ├── LLMNode.tsx
│   │           ├── HttpNode.tsx
│   │           ├── AddToSceneNode.tsx
│   │           ├── Load3DMeshNode.tsx
│   │           ├── PreviewImageNode.tsx
│   │           ├── ExtensionNode.tsx
│   │           └── WorkflowEdge.tsx
│   ├── shared/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   ├── Sidebar.tsx         ← DodaiLogo SVG lives here
│   │   │   │   └── TopBar.tsx
│   │   │   ├── onboarding/
│   │   │   │   └── OnboardingWizard.tsx
│   │   │   └── ui/
│   │   │       ├── ColorPicker.tsx
│   │   │       ├── ConfirmModal.tsx
│   │   │       ├── ErrorModal.tsx
│   │   │       ├── FieldLabel.tsx
│   │   │       ├── Tooltip.tsx
│   │   │       └── UpdateModal.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   ├── useGeneration.ts
│   │   │   └── useHardware.ts
│   │   ├── i18n/
│   │   │   ├── index.ts           exports useT()
│   │   │   └── translations.ts    EN + FR keys
│   │   ├── router/
│   │   │   ├── Router.tsx
│   │   │   └── routes.tsx
│   │   ├── stores/
│   │   │   ├── appStore.ts
│   │   │   ├── extensionsStore.ts
│   │   │   ├── favoritesStore.ts
│   │   │   ├── langStore.ts
│   │   │   ├── navStore.ts
│   │   │   └── workflowsStore.ts
│   │   ├── types/
│   │   │   ├── collections.ts
│   │   │   └── electron.d.ts
│   │   ├── ui/
│   │   │   └── index.tsx
│   │   └── utils/
│   │       └── format.ts
│   └── styles/globals.css      Tailwind + custom classes (.btn-gradient etc.)
├── api/                        FastAPI backend (Python)
│   ├── main.py
│   ├── runner.py
│   ├── routers/
│   │   ├── llm.py              LLM inference + model hub
│   │   ├── hardware.py         GPU detection (7-method cascade)
│   │   ├── generation.py
│   │   ├── model.py
│   │   ├── optimize.py
│   │   ├── export.py
│   │   ├── settings.py
│   │   ├── status.py
│   │   ├── extensions.py
│   │   ├── text_generation.py
│   │   └── workflow_runs.py
│   ├── schemas/
│   │   └── generation.py
│   └── services/
│       ├── extension_process.py
│       ├── generator_registry.py
│       └── generators/
└── resources/icons/            App icons (icon.png, .ico, .icns)
```

## Key commands

```bash
cd modly
npm run dev          # start Electron + Vite dev server
npm run build        # production build
npm run lint         # ESLint
```

## Branding

- **App name**: Dodai 3D (was "Modly" — fully renamed)
- **App ID**: `com.dodai3d.app`
- **Tagline**: "Local AI · open source · runs on your GPU"
- **Color scheme**: Dark (#09090b bg) + purple→blue gradient accent (#8b5cf6 → #3b82f6)
- **Logo SVG**: in `Sidebar.tsx:DodaiLogo` and `FirstRunSetup.tsx:DodaiLogo`
- **CSS class**: `.btn-gradient` in globals.css (purple→blue gradient button)
- **Design system**: zinc palette, glassmorphism (backdrop-blur, rgba backgrounds, rgba borders)

### Nano Banana logo prompt

> A modern, minimalist 3D application logo for "Dodai 3D". The mark is an abstract geometric letterform — a stylized "D" built from two crystalline, faceted shapes that suggest depth and three-dimensionality. The shapes are rendered with a smooth gradient flowing from deep violet (#8B5CF6) at the top-left to electric blue (#3B82F6) at the bottom-right, with subtle lighter highlights (#C4B5FD) along the top edges to imply a light source. The overall silhouette is bold and symmetrical, fitting inside a rounded-square frame. Style: flat vector with gradient fill, clean hard edges, no shadows, no glow, no text. Suitable for use as an app icon at 64×64 px and 512×512 px.

## Stores

### navStore (`src/shared/stores/navStore.ts`)
```typescript
type Page = 'dashboard' | 'chat' | 'generate' | 'workflows' | 'models' | 'settings'
// Usage:
const { navigate } = useNavStore()
navigate('models')
```

### appStore (`src/shared/stores/appStore.ts`)
```typescript
// Key fields:
const apiUrl = useAppStore((s) => s.apiUrl)  // e.g. "http://localhost:8765"
```

### langStore
- localStorage key: `dodai-lang`
- Zustand persist

## i18n

```typescript
import { useT } from '@shared/i18n'
const t = useT()
// Chat keys:
t.chat.title / t.chat.newChat / t.chat.systemPrompt / t.chat.systemDefault
t.chat.temperature / t.chat.contextLength / t.chat.params / t.chat.copyCode
t.chat.placeholder / t.chat.send / t.chat.stop / t.chat.loadingModel
t.chat.thinking / t.chat.you / t.chat.assistant / t.chat.clearHistory
```

To add a new language:
1. Add key to `src/shared/i18n/translations.ts`
2. Add lang type to `src/shared/stores/langStore.ts`
3. Add toggle in `Sidebar.tsx`

## FastAPI backend

- **Port**: 8765 (exposed via `apiUrl` from appStore)
- **Base URL in dev**: `http://localhost:8765`

### LLM endpoints (`/llm/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/llm/models` | List downloaded GGUF models |
| GET | `/llm/status` | `{ loaded: bool, model_id: string\|null }` |
| POST | `/llm/load` | `{ model_id: string }` — loads model (n_ctx=4096) |
| DELETE | `/llm/unload` | Unloads current model |
| POST | `/llm/chat` | SSE stream — see ChatRequest schema |
| GET | `/llm/hub/featured` | Curated model list |
| GET | `/llm/hub/search?q=` | HuggingFace search |
| POST | `/llm/hub/download` | `{ repo_id, filename }` — background download |
| GET | `/llm/hub/download/{filename}/progress` | `{ progress, total, done, error }` |
| DELETE | `/llm/hub/download/{filename}` | Cancel download |
| DELETE | `/llm/models/{filename}` | Delete downloaded model |

### ChatRequest schema (`POST /llm/chat`)
```python
class ChatRequest(BaseModel):
    model_id:      Optional[str] = None
    messages:      List[ChatMessage]   # [{ role, content }]
    temperature:   float = 0.7
    max_tokens:    int   = 2048
    system_prompt: str   = "You are a helpful AI assistant."
```

### SSE stream format
```
data: {"token": "..."}\n\n
...
data: [DONE]\n\n
```

### Models directory
`~/dodai-models/` — env var `MODELS_DIR` overrides. Only `.gguf` files are scanned.

### TODO in llm.py
- `n_ctx` is hardcoded to 4096 in `/llm/load`. Make it accept `n_ctx` from the load request to support per-conversation context length.

### Hardware endpoints
- `GET /hardware/debug` — returns JSON with all 7 GPU detection method results

## ChatPage — current state & planned rewrite

### Current file: `src/areas/chat/ChatPage.tsx` (625 lines)

**Problems in current version:**
- `let msgCounter = 0` at module level (resets on HMR, not unique)
- No conversation persistence (lost on refresh)
- No conversation sidebar
- `contextLength` frozen at 4096, `systemPrompt` frozen at default (not editable)
- `MessageContent` only handles fenced code blocks — no bold/italic/inline code

**Working SSE streaming pattern (preserve this exactly):**
```typescript
const response = await fetch(`${apiUrl}/llm/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_id:      selectedId,
    messages:      allMessages.map(m => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens:    contextLength,
    system_prompt: systemPrompt,
  }),
  signal: abortRef.current.signal,
})
const reader  = response.body.getReader()
const decoder = new TextDecoder()
// reads lines starting with "data: ", parses JSON.parse(data).token
```

### Planned rewrite — data model
```typescript
interface Message {
  id: string          // crypto.randomUUID()
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string       // auto-set from first 50 chars of first user message
  messages: Message[]
  modelId: string | null
  systemPrompt: string
  temperature: number
  contextLength: number   // slider 512–8192, default 4096
  createdAt: number
  updatedAt: number
}
```

### Planned rewrite — localStorage
```typescript
const STORAGE_KEY = 'dodai-chat-conversations'
// Load: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
// Save: localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
```

### Planned rewrite — layout
```
┌─ 260px sidebar ──┬─── main chat ─────────────────────────────┐
│ [+ New chat]     │  TopBar: conv title + ⚙ params toggle      │
│                  ├──────────────────────────────────────────│
│ Today            │  Messages (scrollable)                    │
│  • Conv 1        │   - MessageBubble with markdown           │
│  • Conv 2        │   - hover actions: copy/regen/edit        │
│ Yesterday        │   - TypingIndicator                       │
│  • Conv 3        ├──────────────────────────────────────────│
│ This week        │  InputArea: textarea + ModelDropdown      │
│ Older            │           + send/stop button              │
│                  │                                           │
│                  │  [Params panel: 220px right, collapsible] │
│                  │   systemPrompt textarea                   │
│                  │   temperature slider 0–2                 │
│                  │   contextLength slider 512–8192           │
└──────────────────┴───────────────────────────────────────────┘
```

### Planned rewrite — sendMessages (avoids stale closure)
```typescript
async function sendMessages(
  convId: string,
  allMessages: Message[],
  params: { modelId: string | null; temperature: number; contextLength: number; systemPrompt: string }
)
```

### Planned rewrite — auto-title
```typescript
setConversations(prev => prev.map(c =>
  c.id === convId && c.title === 'New conversation'
    ? { ...c, title: allMessages[0].content.slice(0, 50).trim() }
    : c
))
```

### Planned rewrite — markdown rendering (no external lib)
Inline parser: `**bold**` → `<strong>`, `*italic*` → `<em>`, `` `code` `` → `<code>`,
fenced code blocks with language label + copy button.

### Planned rewrite — message actions (on hover)
- All messages: copy content
- Last assistant message: regenerate (re-sends history up to that point)
- User messages: inline edit → re-trigger stream

### Planned rewrite — sidebar grouping
Groups: **Today** / **Yesterday** / **This week** / **Older** (by `updatedAt`)

## GPU detection (hardware.py)

7-method cascade in order:
1. `pynvml` — direct NVML binding (fastest, most reliable)
2. `nvidia-smi` — subprocess, multiple Windows paths
3. `nvidia-smi` via PowerShell — finds exe anywhere on disk
4. `torch.cuda` — if PyTorch installed in venv
5. `winreg` — reads display adapter class from Windows Registry
6. `wmic` — Windows Management Instrumentation CLI
7. `Get-CimInstance` via PowerShell — Windows 11 wmic replacement

**Debug endpoint**: `GET http://localhost:8765/hardware/debug`

**Ongoing issue**: GPU detection failing for RTX 4060 Windows machine.
After `git pull` + restart, check the debug endpoint and paste JSON to diagnose.

## Pending tasks (ordered by priority)

1. **[URGENT] Rewrite `src/areas/chat/ChatPage.tsx`**
   Full spec above — sidebar + persistence + markdown + message actions + per-conv params.
   Write in 2 parts (types/helpers first, then main component) to avoid stream timeout.

2. **[next] `api/routers/llm.py`** — make `n_ctx` configurable via `/llm/load` body

3. **[next] `src/areas/models/components/LLMHub.tsx`**
   Premium glassmorphism model cards, "Start Chat →" button per model

4. **[fix] GPU detection** — RTX 4060 on Windows not detected, check `/hardware/debug`

## Vision: "Ollama/LM Studio for 3D"

- Model hub with one-click download and status indicators ✅ (done)
- Hardware detection + onboarding wizard ✅ (done)
- LLM chat with local GGUF models ✅ (done, rewrite pending)
- n8n-style visual workflow builder ✅ (done)
- EN/FR bilingual ✅ (done)
- Chat conversation history + persistence ← in progress
- Hardware dashboard (GPU usage, VRAM, temp)
- Generation history with preview
- Batch generation support
- Plugin/extension system (started)
- REST API for programmatic access
