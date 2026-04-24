"""
LLM inference router — llama-cpp-python based.
Supports GGUF models stored in the models directory.
"""
import os
import re
import json
import asyncio
from pathlib import Path
from typing import List, Optional, AsyncGenerator, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# ── Global state ──────────────────────────────────────────────────────────────

_llm = None          # loaded Llama instance
_loaded_id: Optional[str] = None
_downloads: Dict[str, Dict[str, Any]] = {}   # filename → {progress, total, done, error}

def _models_dir() -> Path:
    d = Path(os.environ.get("MODELS_DIR", Path.home() / "dodai-models"))
    d.mkdir(parents=True, exist_ok=True)
    return d

def _gguf_files() -> List[Path]:
    return sorted(_models_dir().rglob("*.gguf"))

# ── Schemas ───────────────────────────────────────────────────────────────────

class LlmModelInfo(BaseModel):
    id:           str
    name:         str
    size_gb:      float
    parameters:   str
    quantization: str
    loaded:       bool

class LoadRequest(BaseModel):
    model_id: str

class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    model_id:     Optional[str] = None
    messages:     List[ChatMessage]
    temperature:  float = 0.7
    max_tokens:   int   = 2048
    system_prompt: str  = "You are a helpful AI assistant."

class DownloadRequest(BaseModel):
    repo_id:  str
    filename: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_model_info(path: Path) -> LlmModelInfo:
    name = path.stem
    size_gb = round(path.stat().st_size / 1e9, 2)

    # Try to extract quantization from filename (e.g. Q4_K_M, Q8_0)
    import re
    quant_match = re.search(r'(Q\d+[_A-Z0-9]*|F16|F32|BF16)', name, re.IGNORECASE)
    quantization = quant_match.group(1).upper() if quant_match else "GGUF"

    # Rough parameter count from file size
    if size_gb > 35:
        params = "70B"
    elif size_gb > 12:
        params = "13B–34B"
    elif size_gb > 5:
        params = "7B–13B"
    elif size_gb > 2:
        params = "3B–7B"
    else:
        params = "1B–3B"

    model_id = str(path.relative_to(_models_dir()))

    return LlmModelInfo(
        id=model_id,
        name=_friendly_name(name),
        size_gb=size_gb,
        parameters=params,
        quantization=quantization,
        loaded=(model_id == _loaded_id),
    )

def _friendly_name(stem: str) -> str:
    # Convert filename to readable name: "Meta-Llama-3-8B-Instruct.Q4_K_M" → "Llama 3 8B Instruct"
    import re
    name = re.sub(r'[\.\-_]Q\d+[_A-Z0-9]*$', '', stem, flags=re.IGNORECASE)
    name = re.sub(r'[\.\-_](F16|F32|BF16)$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\.\-_]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    # Capitalize words
    return ' '.join(w.capitalize() if w.lower() not in ('and', 'of', 'the') else w for w in name.split())

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/models", response_model=List[LlmModelInfo])
def list_models():
    return [_parse_model_info(p) for p in _gguf_files()]


@router.get("/status")
def get_status():
    return {
        "loaded": _loaded_id is not None,
        "model_id": _loaded_id,
    }


@router.post("/load")
def load_model(req: LoadRequest):
    global _llm, _loaded_id

    model_path = _models_dir() / req.model_id
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model not found: {req.model_id}")

    # Unload previous
    if _llm is not None:
        _llm = None
        _loaded_id = None

    try:
        from llama_cpp import Llama
        _llm = Llama(
            model_path=str(model_path),
            n_ctx=4096,
            n_gpu_layers=-1,  # offload all layers to GPU if available
            verbose=False,
        )
        _loaded_id = req.model_id
        return {"status": "loaded", "model_id": _loaded_id}
    except Exception as e:
        _llm = None
        _loaded_id = None
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/unload")
def unload_model():
    global _llm, _loaded_id
    _llm = None
    _loaded_id = None
    return {"status": "unloaded"}


@router.post("/chat")
async def chat(req: ChatRequest):
    if _llm is None:
        raise HTTPException(status_code=400, detail="No model loaded. Call /llm/load first.")

    messages = [{"role": "system", "content": req.system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    async def token_stream() -> AsyncGenerator[str, None]:
        loop = asyncio.get_event_loop()

        def _generate():
            return _llm.create_chat_completion(
                messages=messages,
                temperature=req.temperature,
                max_tokens=req.max_tokens,
                stream=True,
            )

        stream = await loop.run_in_executor(None, _generate)

        for chunk in stream:
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            token = delta.get("content", "")
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Hub ───────────────────────────────────────────────────────────────────────

FEATURED = [
    {
        "id": "bartowski/Llama-3.2-1B-Instruct-GGUF",
        "name": "Llama 3.2 1B", "author": "Meta",
        "description": "Ultra léger — parfait pour tester ou les machines avec peu de RAM.",
        "params": "1B", "min_vram_gb": 1, "tags": ["chat", "lightweight"],
        "variants": [{"filename": "Llama-3.2-1B-Instruct-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 0.81}],
    },
    {
        "id": "bartowski/Llama-3.2-3B-Instruct-GGUF",
        "name": "Llama 3.2 3B", "author": "Meta",
        "description": "Compact mais capable. Idéal pour les tâches quotidiennes.",
        "params": "3B", "min_vram_gb": 2, "tags": ["chat"],
        "variants": [
            {"filename": "Llama-3.2-3B-Instruct-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 2.02},
            {"filename": "Llama-3.2-3B-Instruct-Q8_0.gguf",   "quant": "Q8_0",   "size_gb": 3.42},
        ],
    },
    {
        "id": "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF",
        "name": "Llama 3.1 8B", "author": "Meta",
        "description": "Le modèle phare open-source de Meta — excellent pour le chat et le code.",
        "params": "8B", "min_vram_gb": 6, "tags": ["chat", "coding", "recommended"],
        "variants": [
            {"filename": "Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 4.92},
            {"filename": "Meta-Llama-3.1-8B-Instruct-Q6_K.gguf",   "quant": "Q6_K",   "size_gb": 6.35},
            {"filename": "Meta-Llama-3.1-8B-Instruct-Q8_0.gguf",   "quant": "Q8_0",   "size_gb": 8.54},
        ],
    },
    {
        "id": "microsoft/Phi-3.5-mini-instruct-gguf",
        "name": "Phi-3.5 Mini", "author": "Microsoft",
        "description": "Modèle compact de Microsoft avec de fortes capacités de raisonnement.",
        "params": "3.8B", "min_vram_gb": 3, "tags": ["chat", "reasoning"],
        "variants": [{"filename": "Phi-3.5-mini-instruct-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 2.39}],
    },
    {
        "id": "bartowski/Qwen2.5-7B-Instruct-GGUF",
        "name": "Qwen 2.5 7B", "author": "Alibaba",
        "description": "Modèle multilingue puissant — excellent en français !",
        "params": "7B", "min_vram_gb": 5, "tags": ["chat", "multilingual", "français"],
        "variants": [
            {"filename": "Qwen2.5-7B-Instruct-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 4.68},
            {"filename": "Qwen2.5-7B-Instruct-Q8_0.gguf",   "quant": "Q8_0",   "size_gb": 7.70},
        ],
    },
    {
        "id": "bartowski/gemma-2-2b-it-GGUF",
        "name": "Gemma 2 2B", "author": "Google",
        "description": "Petit modèle de Google avec une excellente compréhension des instructions.",
        "params": "2B", "min_vram_gb": 2, "tags": ["chat"],
        "variants": [
            {"filename": "gemma-2-2b-it-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 1.63},
            {"filename": "gemma-2-2b-it-Q8_0.gguf",   "quant": "Q8_0",   "size_gb": 2.78},
        ],
    },
    {
        "id": "bartowski/Mistral-7B-Instruct-v0.3-GGUF",
        "name": "Mistral 7B v0.3", "author": "Mistral AI",
        "description": "Modèle français rapide et efficace — excellentes performances.",
        "params": "7B", "min_vram_gb": 5, "tags": ["chat", "français", "fast"],
        "variants": [
            {"filename": "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 4.37},
            {"filename": "Mistral-7B-Instruct-v0.3-Q8_0.gguf",   "quant": "Q8_0",   "size_gb": 7.70},
        ],
    },
    {
        "id": "bartowski/deepseek-r1-distill-llama-8b-GGUF",
        "name": "DeepSeek R1 8B", "author": "DeepSeek",
        "description": "Modèle de raisonnement avec capacités chain-of-thought.",
        "params": "8B", "min_vram_gb": 6, "tags": ["reasoning", "coding"],
        "variants": [{"filename": "deepseek-r1-distill-llama-8b-Q4_K_M.gguf", "quant": "Q4_K_M", "size_gb": 4.92}],
    },
]


def _extract_quant(filename: str) -> str:
    m = re.search(r'(Q\d+[_A-Z0-9]*|F16|F32|BF16)', filename, re.IGNORECASE)
    return m.group(1).upper() if m else "GGUF"


@router.get("/hub/featured")
def hub_featured():
    result = []
    for model in FEATURED:
        mc = dict(model)
        mc["variants"] = [
            {**v, "downloaded": (_models_dir() / v["filename"]).exists()}
            for v in model["variants"]
        ]
        result.append(mc)
    return result


@router.get("/hub/search")
async def hub_search(q: str = ""):
    params = {
        "search": q if q else "instruct",
        "filter": "gguf",
        "sort": "downloads",
        "direction": "-1",
        "limit": 24,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://huggingface.co/api/models", params=params)
            resp.raise_for_status()
            models = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"HuggingFace API error: {e}")

    result = []
    for m in models:
        repo_id = m.get("modelId") or m.get("id", "")
        variants = []
        for sib in m.get("siblings", []):
            fname = sib.get("rfilename", "")
            if fname.endswith(".gguf") and not fname.endswith(".part"):
                size_bytes = sib.get("size", 0)
                variants.append({
                    "filename": fname,
                    "quant": _extract_quant(fname),
                    "size_gb": round(size_bytes / 1e9, 2) if size_bytes else None,
                    "downloaded": (_models_dir() / fname).exists(),
                })
        if not variants:
            continue
        variants.sort(key=lambda v: v.get("size_gb") or 0)
        result.append({
            "id": repo_id,
            "name": repo_id.split("/")[-1].replace("-GGUF", "").replace("_", " "),
            "author": repo_id.split("/")[0] if "/" in repo_id else "",
            "downloads": m.get("downloads", 0),
            "likes": m.get("likes", 0),
            "tags": [t for t in m.get("tags", []) if t not in ("gguf", "transformers", "pytorch")],
            "variants": variants[:6],
        })
    return result


@router.post("/hub/download")
async def hub_download(req: DownloadRequest):
    dest = _models_dir() / req.filename
    if dest.exists():
        return {"status": "already_downloaded"}
    if req.filename in _downloads and not _downloads[req.filename].get("error"):
        return {"status": "already_downloading"}

    _downloads[req.filename] = {"progress": 0, "total": 0, "done": False, "error": None}

    async def _do_download():
        url = f"https://huggingface.co/{req.repo_id}/resolve/main/{req.filename}"
        try:
            async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
                async with client.stream("GET", url) as resp:
                    resp.raise_for_status()
                    total = int(resp.headers.get("content-length", 0))
                    _downloads[req.filename]["total"] = total
                    received = 0
                    with open(dest, "wb") as f:
                        async for chunk in resp.aiter_bytes(65536):
                            f.write(chunk)
                            received += len(chunk)
                            _downloads[req.filename]["progress"] = received
            _downloads[req.filename]["done"] = True
        except Exception as e:
            _downloads[req.filename]["error"] = str(e)
            if dest.exists():
                dest.unlink()

    asyncio.create_task(_do_download())
    return {"status": "downloading", "filename": req.filename}


@router.get("/hub/download/{filename:path}/progress")
def hub_download_progress(filename: str):
    info = _downloads.get(filename)
    if info:
        return info
    dest = _models_dir() / filename
    if dest.exists():
        return {"progress": 1, "total": 1, "done": True, "error": None}
    return {"progress": 0, "total": 0, "done": False, "error": "not_found"}


@router.delete("/hub/download/{filename:path}")
def hub_download_cancel(filename: str):
    info = _downloads.pop(filename, None)
    if info:
        dest = _models_dir() / filename
        if dest.exists():
            dest.unlink()
    return {"status": "cancelled"}


@router.delete("/models/{filename:path}")
def delete_model(filename: str):
    dest = _models_dir() / filename
    if not dest.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    dest.unlink()
    global _llm, _loaded_id
    if _loaded_id == filename:
        _llm = None
        _loaded_id = None
    return {"status": "deleted"}
