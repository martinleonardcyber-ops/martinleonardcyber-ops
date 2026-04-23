"""
Hardware detection endpoint.
Detection order: pynvml → nvidia-smi (multiple paths) → torch → wmic (Windows)
"""
import logging
import platform
import subprocess
import re
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["hardware"])

# Common nvidia-smi locations on Windows
_SMI_PATHS = [
    "nvidia-smi",
    r"C:\Windows\System32\nvidia-smi.exe",
    r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
    r"C:\Program Files (x86)\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
]


def _gpu_info_pynvml() -> dict | None:
    """Fastest: direct NVML bindings, no subprocess needed."""
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        name   = pynvml.nvmlDeviceGetName(handle)
        if isinstance(name, bytes):
            name = name.decode()
        mem    = pynvml.nvmlDeviceGetMemoryInfo(handle)
        total  = round(mem.total / 1024 ** 3, 1)
        free   = round(mem.free  / 1024 ** 3, 1)
        pynvml.nvmlShutdown()
        return {"cuda_available": True, "gpu_name": name, "vram_total_gb": total, "vram_free_gb": free}
    except Exception as exc:
        logger.debug("pynvml failed: %s", exc)
        return None


def _gpu_info_nvidia_smi() -> dict | None:
    """Subprocess nvidia-smi — tries multiple common paths."""
    candidates = _SMI_PATHS if platform.system() == "Windows" else ["nvidia-smi"]
    for smi in candidates:
        try:
            r = subprocess.run(
                [smi, "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5,
            )
            if r.returncode != 0:
                continue
            line  = r.stdout.strip().splitlines()[0]
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 3:
                continue
            return {
                "cuda_available": True,
                "gpu_name":       parts[0],
                "vram_total_gb":  round(float(parts[1]) / 1024, 1),
                "vram_free_gb":   round(float(parts[2]) / 1024, 1),
            }
        except Exception:
            continue
    return None


def _gpu_info_torch() -> dict | None:
    """Torch CUDA — only if torch is already installed in the venv."""
    try:
        import torch
        if not torch.cuda.is_available():
            return None
        props = torch.cuda.get_device_properties(0)
        total = round(props.total_memory / 1024 ** 3, 1)
        free_b, _ = torch.cuda.mem_get_info(0)
        return {
            "cuda_available": True,
            "gpu_name":       torch.cuda.get_device_name(0),
            "vram_total_gb":  total,
            "vram_free_gb":   round(free_b / 1024 ** 3, 1),
        }
    except Exception:
        return None


def _gpu_info_wmi() -> dict | None:
    """Windows-only last resort: wmic VideoController."""
    if platform.system() != "Windows":
        return None
    try:
        r = subprocess.run(
            ["wmic", "path", "win32_VideoController", "get", "Name,AdapterRAM", "/format:csv"],
            capture_output=True, text=True, timeout=8,
        )
        for line in r.stdout.splitlines():
            line = line.strip()
            if not line or "Name" in line and "AdapterRAM" in line:
                continue
            parts = line.split(",")
            if len(parts) < 3:
                continue
            name      = parts[2].strip()
            ram_bytes = int(parts[1].strip()) if parts[1].strip().isdigit() else 0
            if "NVIDIA" in name.upper():
                vram = round(ram_bytes / 1024 ** 3, 1) if ram_bytes > 0 else 0.0
                return {"cuda_available": True, "gpu_name": name, "vram_total_gb": vram, "vram_free_gb": vram}
    except Exception as exc:
        logger.debug("wmic failed: %s", exc)
    return None


def _gpu_info() -> dict:
    no_gpu = {"cuda_available": False, "gpu_name": None, "vram_total_gb": 0.0, "vram_free_gb": 0.0}
    return (
        _gpu_info_pynvml()      or
        _gpu_info_nvidia_smi()  or
        _gpu_info_torch()       or
        _gpu_info_wmi()         or
        no_gpu
    )


def _ram_gb() -> float:
    try:
        import psutil
        return round(psutil.virtual_memory().total / 1024 ** 3, 1)
    except Exception:
        pass
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    return round(int(line.split()[1]) / 1024 ** 2, 1)
    except Exception:
        pass
    try:
        r = subprocess.run(
            ["wmic", "OS", "get", "TotalVisibleMemorySize", "/value"],
            capture_output=True, text=True, timeout=5,
        )
        m = re.search(r"TotalVisibleMemorySize=(\d+)", r.stdout)
        if m:
            return round(int(m.group(1)) / 1024 ** 2, 1)
    except Exception:
        pass
    return 0.0


def _recommended_tier(vram_gb: float, cuda: bool) -> str:
    if not cuda:        return "none"
    if vram_gb >= 12:   return "high"
    if vram_gb >= 6:    return "mid"
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
