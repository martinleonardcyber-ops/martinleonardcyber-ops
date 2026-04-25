# Dodai 3D — Dev Log (Session History)

Chronological log of all Claude Code sessions that built this project.
Auteur : Martin Leonard — assisté par Claude (Anthropic).

---

## Session 1 — Origin

**Source**: `https://github.com/lightningpixel/modly`

User discovered the original open-source Modly project (Electron + React + FastAPI for 3D mesh generation from images) and asked Claude to improve it into a premium AI desktop app.

**Requests:**
- Describe the project architecture
- Improve it to match Meshy and other commercial AI 3D tools
- Make it user-friendly, beautiful, professional

---

## Session 2 — Initial Setup & Major Redesign

**Branch created**: `claude/modly-setup-bRzNa`

**Built:**
- Integrated Modly into `martinleonardcyber-ops/martinleonardcyber-ops` repo
- Fixed bugs: infinite poll loops, missing logging, import hoisting
- Premium dark UI redesign (glassmorphism, zinc palette, gradient accents)
- User-friendly hardware detection with model recommendations based on VRAM
- Onboarding wizard (first-run setup)
- Export UI for 3D models
- Quality presets

---

## Session 3 — Branding: "Modly" → "Dodai 3D"

**Requests:**
- "Je veux que ça s'appelle Dodai 3D et plus Modly"
- Add EN/FR bilingual support
- Ultra glassmorphism design (frosted glass panels over ambient gradient orbs)

**Built:**
- Renamed everywhere: package.json, appId (`com.dodai3d.app`), HTML title, Electron app name, localStorage keys, all UI text
- `useT()` i18n hook with `translations.ts` (EN + FR)
- Language toggle in Sidebar (persistent via Zustand + localStorage key `dodai-lang`)
- Glassmorphism redesign: backdrop-blur, rgba borders, ambient orbs
- Fixed: Windows console windows appearing (hideConsole in python-bridge)
- Generated Nano Banana logo prompt (in CLAUDE.md)

---

## Session 4 — LM Studio Vision: Full LLM Integration

**Request:**
> "Je veux plus que ça sois que un truc de 3D, je veux que ça sois comme LM Studio — donc tout les modèles locaux etc, vrm comme LM Studio mais en mieux"

**Built:**
- Full LLM inference stack: `llama-cpp-python` + GGUF models + `~/dodai-models/` directory
- FastAPI router `/llm/` with: `/models`, `/load`, `/unload`, `/chat` (SSE stream), `/status`
- ChatPage: SSE streaming via `fetch()` + `ReadableStream` + `TextDecoder`
- Model dropdown with search, load indicator (spinner), green dot for loaded model
- MessageBubble component (user right-aligned, assistant left with avatar)
- MessageContent: fenced code blocks with language label
- TypingIndicator (3 bouncing dots)
- Temperature slider in collapsible params panel
- Fixed: FastAPI crash (pydantic_core incompatibility on Windows)
- Fixed: API port hardcoded wrong on Dashboard

---

## Session 5 — LLM Model Hub (like HuggingFace + LM Studio)

**Request:**
- "Je veux tester sur mon ordi Windows"
- GPU not detected on Dashboard

**Built:**
- `/llm/hub/featured` — curated list of 8 models (Llama 3.2 1B/3B, Llama 3.1 8B, Phi-3.5, Qwen 2.5 7B, Gemma 2 2B, Mistral 7B, DeepSeek R1 8B)
- `/llm/hub/search?q=` — live HuggingFace API search
- `/llm/hub/download` — background download with progress polling
- LLMHub.tsx: tab UI (Featured / Search), model cards, download button, progress bar
- GPU detection 7-method cascade in `hardware.py` (pynvml → nvidia-smi → PowerShell → torch → winreg → wmic → CimInstance)
- `/hardware/debug` endpoint for diagnosing GPU detection failures
- Fixed: "Bundled Python runtime not found" error on Windows dev mode
- Fixed: "Welcome to Modly" branding leftovers in onboarding

---

## Session 6 — n8n-style Workflow Builder

**Request:**
> "La partie workflow c'est comme n8n ? Je veux que tout sois complet, ultra beau moderne, que ça sois mieux que n8n"

**Built:**
- Workflow node system with @xyflow/react:
  - `InputNode`, `TextNode`, `ImageNode`, `LLMNode`, `HttpNode`
  - `AddToSceneNode`, `Load3DMeshNode`, `PreviewImageNode`, `ExtensionNode`
  - `WorkflowEdge` (animated gradient edge)
  - `BaseNode` (shared frame)
- n8n-style UX:
  - "+" hover button on every node output to add connected node
  - Right-click context menus (duplicate, delete, add node)
  - Ctrl+C/V copy-paste nodes
  - Ctrl+D duplicate
  - Ctrl+A select all
  - MiniMap + Controls panel
  - Execution log panel (per-node status: green/red borders after run)
- LLM node: text input → local model → text output
- HTTP node: GET/POST request with configurable URL + headers

---

## Session 7 — Chat Ollama-style Redesign

**Request:**
> "Grosse refonte et grosse mise à jour de tout ce logiciel — garder le dark glassmorphism actuel mais plus poussé, et vraiment que tout sois magnifique"

**Built:**
- ChatPage Ollama-style redesign:
  - Inline model dropdown in input bar (no sidebar)
  - Centered message layout (max-w-3xl)
  - Empty state with logo + prompt
  - Model loading state in dropdown (spinner per model)
  - Stop button during streaming (red, AbortController)
  - `handleNewChat()` function
  - "Télécharger d'autres modèles" footer in dropdown
- Collapsible params panel (⚙ icon top-right)
- Temperature slider (0–2, labeled Précis/Créatif)

---

## Session 8 — GPU Fix Attempt + Model Quality

**Request:**
> "Il sont vrm bien ces model ?" / "C'est user friendly ?"

**Built:**
- Honest assessment of model quality per VRAM tier
- Hardware-aware model recommendations (auto-suggest based on detected VRAM)
- Better model compatibility UI in onboarding
- Attempted RTX 4060 GPU fix (pynvml, multiple nvidia-smi paths)
- Added Hunyuan3D 2.0 with PBR textures as a better 3D model option
- TRELLIS + InstantMesh adapters (generator_registry)
- 3D preview in Dashboard
- Searchable generation history
- Quality presets (Draft / Balanced / High)

---

## Session 9 — Grosse Refonte Decision

**Request:**
> "Je veux une grosse refonte — le chat, les modèles etc c'est à la zeub, il faut que tout sois incroyable. Propose des trucs."

**Decision made:**
- Full rewrite of ChatPage with:
  - Conversation history sidebar (260px)
  - localStorage persistence (`dodai-chat-conversations`)
  - Proper markdown rendering (**bold**, *italic*, `code`, fenced blocks)
  - Message actions on hover: copy, regenerate, edit
  - Per-conversation settings: modelId, systemPrompt, temperature, contextLength
  - Auto-title from first user message
  - Conversation grouping: Today / Yesterday / This week / Older

**Blockers hit:** `API Error: Stream idle timeout` — large file writes (~800 lines) kept timing out before completion. Rewrite not yet executed.

---

## Session 10 — CLAUDE.md Enrichissement (current)

**Request:**
> "Donne moi le CLAUDE.md complet au max, je vais continuer sur Claude Code CLI"
> "Crée une repo github avec tout le projet dedans incluant le CLAUDE.md et toute nos conversations"

**Done:**
- CLAUDE.md rewritten with full technical spec (all endpoints, stores, data models, rewrite spec)
- DEVLOG.md created (this file) — full session history
- Commit + push to `claude/modly-setup-bRzNa`

---

## Pending / Next steps

| Priority | Task | File |
|----------|------|------|
| 🔴 URGENT | Rewrite ChatPage with sidebar + persistence + markdown | `src/areas/chat/ChatPage.tsx` |
| 🟠 next | Make n_ctx configurable in /llm/load | `api/routers/llm.py` |
| 🟠 next | Rewrite LLMHub with glassmorphism cards + "Start Chat →" | `src/areas/models/components/LLMHub.tsx` |
| 🟡 fix | GPU detection for RTX 4060 Windows | `api/routers/hardware.py` |

---

## Key decisions log

| Date | Decision | Reason |
|------|----------|--------|
| early | Electron + React + FastAPI | Cross-platform, local AI, web stack |
| early | GGUF + llama-cpp-python | No cloud, runs on consumer GPU |
| early | Zustand stores | Simple, no Redux boilerplate |
| early | Tailwind CSS + zinc palette | Fast, consistent dark UI |
| mid | Renamed Modly → Dodai 3D | Unique branding, 3D identity |
| mid | EN/FR i18n | User is French-speaking |
| mid | SSE streaming via fetch() | Native, no library needed |
| mid | ~/dodai-models/ directory | Standard models location |
| recent | Per-conversation params | Each chat has its own settings |
| recent | crypto.randomUUID() for IDs | Replaces fragile msgCounter |
