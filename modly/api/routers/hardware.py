"""
Hardware detection endpoint.
Returns GPU name, VRAM, CUDA availability, RAM, and a recommended model tier.
"""
import logging
import platform
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["hardware"])


def _gpu_info() -> dict:
    try:
        import torch
        if not torch.cuda.is_available():
            return {"cuda_available": False, "gpu_name": None, "vram_total_gb": 0.0, "vram_free_gb": 0.0}
        name  = torch.cuda.get_device_name(0)
        props = torch.cuda.get_device_properties(0)
        total = round(props.total_memory / 1024 ** 3, 1)
        free_bytes, _ = torch.cuda.mem_get_info(0)
        free  = round(free_bytes / 1024 ** 3, 1)
        return {"cuda_available": True, "gpu_name": name, "vram_total_gb": total, "vram_free_gb": free}
    except Exception as exc:
        logger.warning("GPU detection failed: %s", exc)
        return {"cuda_available": False, "gpu_name": None, "vram_total_gb": 0.0, "vram_free_gb": 0.0}


def _ram_gb() -> float:
    try:
        import psutil
        return round(psutil.virtual_memory().total / 1024 ** 3, 1)
    except Exception:
        pass
    try:
        # Linux fallback without psutil
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    kb = int(line.split()[1])
                    return round(kb / 1024 ** 2, 1)
    except Exception:
        pass
    return 0.0


def _recommended_tier(vram_gb: float, cuda: bool) -> str:
    """
    Tiers map to what's runnable:
      none  → CPU only / no GPU detected
      low   → < 6 GB  → Shap-E only
      mid   → 6–11 GB → SF3D, Hunyuan Mini/Turbo, Shap-E
      high  → ≥ 12 GB → all models including Hunyuan3D-2
    """
    if not cuda:
        return "none"
    if vram_gb >= 12:
        return "high"
    if vram_gb >= 6:
        return "mid"
    return "low"


TIER_LABELS = {
    "none": "CPU only — GPU recommended for real-time generation",
    "low":  "Low VRAM — lightweight models only (Shap-E)",
    "mid":  "Mid VRAM — most models supported (SF3D, Hunyuan Mini/Turbo)",
    "high": "High VRAM — all models supported including Hunyuan3D 2.0",
}

TIER_RECOMMENDED_IDS = {
    "none": ["shap-e"],
    "low":  ["shap-e"],
    "mid":  ["sf3d", "hunyuan3d-mini", "hunyuan3d-turbo", "shap-e"],
    "high": ["hunyuan3d-2", "triposg", "hunyuan3d-turbo", "sf3d", "shap-e"],
}


@router.get("/info")
async def hardware_info():
    gpu  = _gpu_info()
    ram  = _ram_gb()
    tier = _recommended_tier(gpu["vram_total_gb"], gpu["cuda_available"])

    return {
        **gpu,
        "cpu_name":        platform.processor() or platform.machine() or "Unknown",
        "ram_gb":          ram,
        "platform":        platform.system(),
        "recommended_tier":       tier,
        "recommended_tier_label": TIER_LABELS[tier],
        "recommended_ids":        TIER_RECOMMENDED_IDS[tier],
    }
