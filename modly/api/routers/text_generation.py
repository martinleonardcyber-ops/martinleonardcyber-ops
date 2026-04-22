"""
Text-to-3D generation endpoint.
Requires a generator that sets supports_text = True and implements generate_from_text().
Install a compatible extension (e.g. shap-e) via the Extensions page.
"""
import asyncio
import logging
import traceback
import uuid
from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.generators.base import GenerationCancelled
from services.generator_registry import generator_registry, WORKSPACE_DIR
from schemas.generation import JobStatus

logger = logging.getLogger(__name__)
router = APIRouter(tags=["text-generation"])

_jobs:      Dict[str, JobStatus] = {}
_cancelled: set                  = set()


# ------------------------------------------------------------------ #
# Request schema
# ------------------------------------------------------------------ #

class TextPromptRequest(BaseModel):
    prompt:  str
    style:   str = "realistic"
    quality: str = "standard"


# ------------------------------------------------------------------ #
# Routes
# ------------------------------------------------------------------ #

@router.post("/from-prompt")
async def generate_from_prompt(req: TextPromptRequest):
    if not req.prompt.strip():
        raise HTTPException(400, "Prompt cannot be empty")

    if req.quality not in ("draft", "standard", "hd"):
        raise HTTPException(400, "quality must be 'draft', 'standard', or 'hd'")

    capable = generator_registry.text_capable_ids()
    if not capable:
        raise HTTPException(
            400,
            "No text-to-3D model installed. "
            "Go to Extensions and install a compatible extension "
            "(e.g. lightningpixel/modly-shap-e) to enable text-to-3D generation."
        )

    job_id        = str(uuid.uuid4())
    _jobs[job_id] = JobStatus(job_id=job_id, status="pending", progress=0)

    asyncio.create_task(
        _run_text_generation(job_id, req.prompt, req.style, req.quality)
    )
    return {"job_id": job_id}


@router.get("/status/{job_id}")
async def text_job_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return job


@router.post("/cancel/{job_id}")
async def cancel_text_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    _cancelled.add(job_id)
    if job.status in ("pending", "running"):
        job.status = "cancelled"
    return {"cancelled": True}


@router.get("/capable")
async def list_text_capable():
    """Returns a list of installed generators that support text-to-3D."""
    return {"capable": generator_registry.text_capable_ids()}


# ------------------------------------------------------------------ #
# Background task
# ------------------------------------------------------------------ #

async def _run_text_generation(
    job_id: str, prompt: str, style: str, quality: str
) -> None:
    job        = _jobs[job_id]
    job.status = "running"

    def progress_cb(pct: int, step: str = "") -> None:
        job.progress = pct
        if step:
            job.step = step

    try:
        loop = asyncio.get_running_loop()

        # Resolve generator — load it (download weights if needed)
        progress_cb(0, "Loading text-to-3D model…")
        gen = await loop.run_in_executor(None, generator_registry.get_text_generator)
        if gen is None:
            raise RuntimeError("No text-to-3D model available.")

        if job_id in _cancelled:
            return

        coll_dir = WORKSPACE_DIR / "Text-to-3D"
        coll_dir.mkdir(parents=True, exist_ok=True)
        gen.outputs_dir = coll_dir

        params = {"style": style, "quality": quality}
        progress_cb(10, f"Generating from prompt…")

        output_path = await loop.run_in_executor(
            None,
            lambda: gen.generate_from_text(prompt, params, progress_cb),
        )

        if job_id in _cancelled:
            return

        job.status   = "done"
        job.progress = 100
        try:
            rel = output_path.relative_to(WORKSPACE_DIR)
            job.output_url = f"/workspace/{rel.as_posix()}"
        except ValueError:
            job.output_url = f"/workspace/Text-to-3D/{output_path.name}"

    except GenerationCancelled:
        job.status = "cancelled"
    except Exception as exc:
        if job_id in _cancelled:
            return
        tb = traceback.format_exc()
        logger.error("[TextGeneration ERROR] %s\n%s", exc, tb)
        job.status = "error"
        job.error  = str(exc)
    finally:
        _cancelled.discard(job_id)
