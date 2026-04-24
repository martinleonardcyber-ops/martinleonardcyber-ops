"""
LLM inference router — llama-cpp-python based.
Supports GGUF models stored in the models directory.
"""
import os
import json
import asyncio
from pathlib import Path
from typing import List, Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# ── Global state ──────────────────────────────────────────────────────────────

_llm = None          # loaded Llama instance
_loaded_id: Optional[str] = None

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
