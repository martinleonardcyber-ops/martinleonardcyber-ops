"""
Hardware detection endpoint.
Detection order: pynvml → nvidia-smi (multi-path) → PowerShell nvidia-smi
                → torch → winreg → wmic → PowerShell WMI
"""
import json
import logging
import platform
import subprocess
import re
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["hardware"])

_SMI_PATHS = [
    "nvidia-smi",
    r"C:\Windows\System32\nvidia-smi.exe",
    r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
    r"C:\Program Files (x86)\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
]

_SMI_QUERY = ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"]


def _parse_smi_line(line: str) -> dict | None:
    parts = [p.strip() for p in line.split(",")]
    if len(parts) < 3:
        return None
    try:
        return {
            "cuda_available": True,
            "gpu_name":       parts[0],
            "vram_total_gb":  round(float(parts[1]) / 1024, 1),
            "vram_free_gb":   round(float(parts[2]) / 1024, 1),
        }
    except (ValueError, IndexError):
        return None


def _gpu_info_pynvml() -> dict | None:
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        name   = pynvml.nvmlDeviceGetName(handle)
        if isinstance(name, bytes):
            name = name.decode()
        mem   = pynvml.nvmlDeviceGetMemoryInfo(handle)
        total = round(mem.total / 1024 ** 3, 1)
        free  = round(mem.free  / 1024 ** 3, 1)
        pynvml.nvmlShutdown()
        return {"cuda_available": True, "gpu_name": name, "vram_total_gb": total, "vram_free_gb": free}
    except Exception as exc:
        logger.debug("pynvml failed: %s", exc)
        return None


def _gpu_info_nvidia_smi() -> dict | None:
    """Direct subprocess nvidia-smi — tries multiple common Windows paths."""
    candidates = _SMI_PATHS if platform.system() == "Windows" else ["nvidia-smi"]
    for smi in candidates:
        try:
            r = subprocess.run(
                [smi] + _SMI_QUERY,
                capture_output=True, text=True, timeout=5,
            )
            if r.returncode != 0:
                continue
            result = _parse_smi_line(r.stdout.strip().splitlines()[0])
            if result:
                return result
        except Exception as exc:
            logger.debug("nvidia-smi path %s failed: %s", smi, exc)
    return None


def _gpu_info_nvidia_smi_ps() -> dict | None:
    """PowerShell-assisted nvidia-smi — locates executable then runs it."""
    if platform.system() != "Windows":
        return None
    ps_script = (
        "$smi = $null; "
        "$paths = @('nvidia-smi',"
        "'C:\\Windows\\System32\\nvidia-smi.exe',"
        "'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe',"
        "'C:\\Program Files (x86)\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe'); "
        "foreach ($p in $paths) { try { $resolved = (Get-Command $p -ErrorAction Stop).Source; $smi = $resolved; break } catch { if (Test-Path $p) { $smi = $p; break } } }; "
        "if ($smi) { & $smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits }"
    )
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=15,
        )
        if r.returncode == 0 and r.stdout.strip():
            result = _parse_smi_line(r.stdout.strip().splitlines()[0])
            if result:
                return result
    except Exception as exc:
        logger.debug("powershell nvidia-smi failed: %s", exc)
    return None


def _gpu_info_torch() -> dict | None:
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


def _gpu_info_winreg() -> dict | None:
    """Windows Registry — no subprocess, reads display adapter VRAM directly."""
    if platform.system() != "Windows":
        return None
    try:
        import winreg
        # Display adapter class GUID
        base = r"SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base) as cls_key:
            for i in range(32):
                try:
                    sub_name = winreg.EnumKey(cls_key, i)
                    if not sub_name.isdigit():
                        continue
                    with winreg.OpenKey(cls_key, sub_name) as dev_key:
                        try:
                            drv_desc, _ = winreg.QueryValueEx(dev_key, "DriverDesc")
                        except FileNotFoundError:
                            continue
                        if "NVIDIA" not in str(drv_desc).upper():
                            continue
                        # Try 64-bit VRAM value first, fall back to 32-bit
                        vram_bytes = 0
                        for val_name in ("HardwareInformation.qwMemorySize",
                                         "HardwareInformation.MemorySize"):
                            try:
                                vram_bytes, _ = winreg.QueryValueEx(dev_key, val_name)
                                if vram_bytes and vram_bytes > 0:
                                    break
                            except FileNotFoundError:
                                continue
                        vram_gb = round(vram_bytes / 1024 ** 3, 1) if vram_bytes else 0.0
                        return {
                            "cuda_available": True,
                            "gpu_name":       str(drv_desc),
                            "vram_total_gb":  vram_gb,
                            "vram_free_gb":   vram_gb,
                        }
                except OSError:
                    break
    except Exception as exc:
        logger.debug("winreg GPU detection failed: %s", exc)
    return None


def _gpu_info_wmi() -> dict | None:
    """wmic VideoController — last-resort subprocess on Windows."""
    if platform.system() != "Windows":
        return None
    try:
        r = subprocess.run(
            ["wmic", "path", "win32_VideoController", "get", "Name,AdapterRAM", "/format:list"],
            capture_output=True, text=True, timeout=8,
        )
        name = ram_bytes = None
        for line in r.stdout.splitlines():
            line = line.strip()
            if line.startswith("Name="):
                name = line[5:].strip()
            elif line.startswith("AdapterRAM="):
                try:
                    ram_bytes = int(line[11:].strip())
                except ValueError:
                    ram_bytes = 0
            if name is not None and ram_bytes is not None:
                if "NVIDIA" in name.upper():
                    vram = round(ram_bytes / 1024 ** 3, 1) if ram_bytes and ram_bytes > 0 else 0.0
                    return {"cuda_available": True, "gpu_name": name,
                            "vram_total_gb": vram, "vram_free_gb": vram}
                name = ram_bytes = None
    except Exception as exc:
        logger.debug("wmic failed: %s", exc)
    return None


def _gpu_info_powershell_wmi() -> dict | None:
    """PowerShell Get-CimInstance — works even when wmic is deprecated on Windows 11."""
    if platform.system() != "Windows":
        return None
    ps_script = (
        "Get-CimInstance Win32_VideoController "
        "| Where-Object { $_.Name -like '*NVIDIA*' } "
        "| Select-Object -First 1 Name,AdapterRAM "
        "| ConvertTo-Json -Compress"
    )
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=12,
        )
        if r.returncode != 0 or not r.stdout.strip():
            return None
        data = json.loads(r.stdout.strip())
        gpu_name  = data.get("Name", "")
        ram_bytes = data.get("AdapterRAM", 0) or 0
        if "NVIDIA" in str(gpu_name).upper():
            vram = round(ram_bytes / 1024 ** 3, 1) if ram_bytes > 0 else 0.0
            return {"cuda_available": True, "gpu_name": gpu_name,
                    "vram_total_gb": vram, "vram_free_gb": vram}
    except Exception as exc:
        logger.debug("powershell wmi failed: %s", exc)
    return None


def _gpu_info() -> dict:
    no_gpu = {"cuda_available": False, "gpu_name": None, "vram_total_gb": 0.0, "vram_free_gb": 0.0}
    return (
        _gpu_info_pynvml()         or
        _gpu_info_nvidia_smi()     or
        _gpu_info_nvidia_smi_ps()  or
        _gpu_info_torch()          or
        _gpu_info_winreg()         or
        _gpu_info_wmi()            or
        _gpu_info_powershell_wmi() or
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
    if not cuda:       return "none"
    if vram_gb >= 12:  return "high"
    if vram_gb >= 6:   return "mid"
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


@router.get("/debug")
async def hardware_debug():
    """Returns raw output from each detection method for troubleshooting."""
    results = {}

    try:
        import pynvml
        pynvml.nvmlInit()
        results["pynvml"] = "available"
        pynvml.nvmlShutdown()
    except Exception as e:
        results["pynvml"] = f"failed: {e}"

    for smi in _SMI_PATHS:
        try:
            import os
            exists = os.path.isfile(smi) if smi != "nvidia-smi" else True
            r = subprocess.run([smi] + _SMI_QUERY, capture_output=True, text=True, timeout=5)
            results[f"smi:{smi}"] = {"rc": r.returncode, "out": r.stdout[:200], "err": r.stderr[:200], "exists": exists}
        except Exception as e:
            results[f"smi:{smi}"] = f"exception: {e}"

    try:
        ps_script = "$smi = $null; $paths = @('nvidia-smi','C:\\Windows\\System32\\nvidia-smi.exe','C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe'); foreach ($p in $paths) { if (Test-Path $p -ErrorAction SilentlyContinue) { $smi = $p; break } }; if ($smi) { & $smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits } else { Write-Output 'not-found' }"
        r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                           capture_output=True, text=True, timeout=15)
        results["ps_smi"] = {"rc": r.returncode, "out": r.stdout[:300], "err": r.stderr[:200]}
    except Exception as e:
        results["ps_smi"] = f"exception: {e}"

    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command",
             "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress"],
            capture_output=True, text=True, timeout=12,
        )
        results["ps_wmi"] = {"rc": r.returncode, "out": r.stdout[:500], "err": r.stderr[:200]}
    except Exception as e:
        results["ps_wmi"] = f"exception: {e}"

    try:
        import winreg
        base = r"SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        adapters = []
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base) as k:
            for i in range(8):
                try:
                    sub = winreg.EnumKey(k, i)
                    if not sub.isdigit():
                        continue
                    with winreg.OpenKey(k, sub) as dk:
                        try:
                            desc, _ = winreg.QueryValueEx(dk, "DriverDesc")
                            adapters.append(str(desc))
                        except Exception:
                            pass
                except OSError:
                    break
        results["winreg_adapters"] = adapters
    except Exception as e:
        results["winreg_adapters"] = f"exception: {e}"

    results["final"] = _gpu_info()
    return results
