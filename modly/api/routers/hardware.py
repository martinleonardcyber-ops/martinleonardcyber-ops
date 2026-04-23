"""
Hardware detection endpoint.
Uses nvidia-smi (no dependencies) as primary method, falls back to torch if available.
"""
import logging
import platform
import subprocess
import re
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["hardware"])


def _gpu_info_nvidia_smi() -> dict | None:
    """Query GPU via nvidia-smi — works without torch installed."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.free",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return None
        line = result.stdout.strip().splitlines()[0]
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            return None
        name        = parts[0]
        total_mb    = float(parts[1])
        free_mb     = float(parts[2])
        return {
            "cuda_available": True,
            "gpu_name":       name,
            "vram_total_gb":  round(total_mb / 1024, 1),
            "vram_free_gb":   round(free_mb  / 1024, 1),
        }
    except Exception as exc:
        logger.debug("nvidia-smi unavailable: %s", exc)
        return None


def _gpu_info_torch() -> dict | None:
    """Query GPU via torch — only works if torch+CUDA is installed."""
    try:
        import torch
        if not torch.cuda.is_available():
            return None
        name        = torch.cuda.get_device_name(0)
        props       = torch.cuda.get_device_properties(0)
        total       = round(props.total_memory / 1024 ** 3, 1)
        free_bytes, _ = torch.cuda.mem_get_info(0)
        free        = round(free_bytes / 1024 ** 3, 1)
        return {"cuda_available": True, "gpu_name": name, "vram_total_gb": total, "vram_free_gb": free}
    except Exception:
        return None


def _gpu_info_wmi() -> dict | None:
    """Windows fallback: query GPU name via wmic (no CUDA info, but at least shows the card)."""
    if platform.system() != "Windows":
        return None
    try:
        result = subprocess.run(
            ["wmic", "path", "win32_VideoController", "get", "name,AdapterRAM", "/format:csv"],
            capture_output=True, text=True, timeout=5,
        )
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("Node"):
                continue
            parts = line.split(",")
            if len(parts) >= 3:
                name = parts[2].strip()
                ram_bytes = int(parts[1].strip()) if parts[1].strip().isdigit() else 0
                if "NVIDIA" in name.upper() or "AMD" in name.upper() or "RADEON" in name.upper():
                    vram_gb = round(ram_bytes / 1024 ** 3, 1)
                    return {
                        "cuda_available": "NVIDIA" in name.upper(),
                        "gpu_name":       name,
                        "vram_total_gb":  vram_gb,
                        "vram_free_gb":   vram_gb,
                    }
    except Exception as exc:
        logger.debug("wmic GPU query failed: %s", exc)
    return None


def _gpu_info() -> dict:
    no_gpu = {"cuda_available": False, "gpu_name": None, "vram_total_gb": 0.0, "vram_free_gb": 0.0}
    return _gpu_info_nvidia_smi() or _gpu_info_torch() or _gpu_info_wmi() or no_gpu


def _ram_gb() -> float:
    try:
        import psutil
        return round(psutil.virtual_memory().total / 1024 ** 3, 1)
    except Exception:
        pass
    # Linux fallback
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    return round(int(line.split()[1]) / 1024 ** 2, 1)
    except Exception:
        pass
    # Windows fallback via wmic
    try:
        result = subprocess.run(
            ["wmic", "OS", "get", "TotalVisibleMemorySize", "/value"],
            capture_output=True, text=True, timeout=5,
        )
        m = re.search(r"TotalVisibleMemorySize=(\d+)", result.stdout)
        if m:
            return round(int(m.group(1)) / 1024 ** 2, 1)
    except Exception:
        pass
    return 0.0


def _recommended_tier(vram_gb: float, cuda: bool) -> str:
    if not cuda:    return "none"
    if vram_gb >= 12: return "high"
    if vram_gb >= 6:  return "mid"
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
        "cpu_name":               platform.processor() or platform.machine() or "Unknown",
        "ram_gb":                 ram,
        "platform":               platform.system(),
        "recommended_tier":       tier,
        "recommended_tier_label": TIER_LABELS[tier],
        "recommended_ids":        TIER_RECOMMENDED_IDS[tier],
    }
