"""
GeneratorRegistry — manages the lifecycle of all model adapters.
Dynamically loads extensions from the extensions/ folder.

To add a new model: create a folder in extensions/ with
  - manifest.json  (metadata + hf_repo + pip_requirements...)
  - generator.py   (class extending BaseGenerator)
No other file needs to be modified.
"""
import importlib.util
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from services.generators.base import BaseGenerator
from services.extension_process import ExtensionProcess, _venv_python

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
# Global paths
# ------------------------------------------------------------------ #

_models_dir_raw    = os.environ.get("MODELS_DIR")    or str(Path.home() / ".modly" / "models")
_workspace_dir_raw = os.environ.get("WORKSPACE_DIR") or str(Path.home() / ".modly" / "workspace")
MODELS_DIR    = Path(_models_dir_raw)
WORKSPACE_DIR = Path(_workspace_dir_raw)

MODELS_DIR.mkdir(parents=True, exist_ok=True)
WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

_extensions_dir_raw = os.environ.get("EXTENSIONS_DIR", "")
EXTENSIONS_DIR = Path(_extensions_dir_raw) if _extensions_dir_raw else None

logger.info("MODELS_DIR     = %s", MODELS_DIR)
logger.info("WORKSPACE_DIR  = %s", WORKSPACE_DIR)
logger.info("EXTENSIONS_DIR = %s", EXTENSIONS_DIR or "(not set)")


# ------------------------------------------------------------------ #
# Extension loader
# ------------------------------------------------------------------ #

def _discover_extensions() -> Dict[str, Tuple[type, dict, Path]]:
    """
    Scans EXTENSIONS_DIR to find valid extensions.
    Returns {full_id: (GeneratorClass_or_None, manifest, ext_dir)}.
    """
    result: Dict[str, Tuple[type, dict, Path]] = {}

    if EXTENSIONS_DIR is None or not EXTENSIONS_DIR.exists():
        logger.warning("EXTENSIONS_DIR not set or not found: %s", EXTENSIONS_DIR)
        return result

    for ext_dir in sorted(EXTENSIONS_DIR.iterdir()):
        if not ext_dir.is_dir():
            continue

        manifest_path  = ext_dir / "manifest.json"
        generator_path = ext_dir / "generator.py"

        if not manifest_path.exists():
            logger.debug("Skipping '%s': missing manifest.json", ext_dir.name)
            continue
        if not generator_path.exists():
            logger.debug("Skipping '%s': missing generator.py", ext_dir.name)
            continue

        try:
            manifest   = json.loads(manifest_path.read_text(encoding="utf-8"))
            ext_id     = manifest["id"]
            class_name = manifest["generator_class"]

            nodes = [n for n in manifest.get("nodes", []) if n.get("id")]

            has_venv         = _venv_python(ext_dir).exists()
            has_build_vendor = (ext_dir / "build_vendor.py").exists()
            vendor_built     = (ext_dir / "vendor").exists()
            subprocess_mode  = has_venv or (has_build_vendor and not vendor_built)

            cls_or_None = None
            if not subprocess_mode:
                module_name = f"extensions.{ext_id}.generator"
                spec   = importlib.util.spec_from_file_location(module_name, generator_path)
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
                cls_or_None = getattr(module, class_name)

            if nodes:
                for node in nodes:
                    node_manifest = {
                        **manifest,
                        "id":               f"{ext_id}/{node['id']}",
                        "ext_id":           ext_id,
                        "node_id":          node["id"],
                        "name":             node.get("name", node["id"]),
                        "hf_repo":          node.get("hf_repo", ""),
                        "download_check":   node.get("download_check", ""),
                        "hf_skip_prefixes": node.get("hf_skip_prefixes", []),
                        "params_schema":    node.get("params_schema", []),
                        "input":            node.get("input", "image"),
                        "output":           node.get("output", "mesh"),
                    }
                    full_id = f"{ext_id}/{node['id']}"
                    result[full_id] = (cls_or_None, node_manifest, ext_dir)
                    mode_label = "subprocess" if subprocess_mode else "direct"
                    logger.info("Loaded %s node: %s", mode_label, full_id)
            else:
                result[ext_id] = (cls_or_None, manifest, ext_dir)
                mode_label = "subprocess" if subprocess_mode else "direct"
                logger.info("Loaded %s extension: %s", mode_label, ext_id)

        except Exception as exc:
            logger.error("Failed to load extension '%s': %s", ext_dir.name, exc)

    return result


# ------------------------------------------------------------------ #
# GeneratorRegistry
# ------------------------------------------------------------------ #

class GeneratorRegistry:
    def __init__(self) -> None:
        self._generators: Dict[str, BaseGenerator] = {}
        self._manifests:  Dict[str, dict]          = {}
        self._errors:     Dict[str, str]           = {}
        self._active_id:  str = os.environ.get("SELECTED_MODEL_ID", "sf3d")

    # ------------------------------------------------------------------ #
    # Initialisation / reload
    # ------------------------------------------------------------------ #

    def initialize(self) -> None:
        """Discovers and instantiates all extensions. Call at startup."""
        extensions = _discover_extensions()

        for model_id, (cls, manifest, ext_dir) in extensions.items():
            self._load_extension(model_id, cls, manifest, ext_dir)

        if not self._generators:
            logger.warning("No extensions found.")
            return

        if self._active_id not in self._generators:
            fallback = next(iter(self._generators))
            logger.warning(
                "SELECTED_MODEL_ID='%s' is unknown — falling back to '%s'.",
                self._active_id, fallback,
            )
            self._active_id = fallback

        logger.info("Active model : %s", self._active_id)
        logger.info("All models   : %s", list(self._generators.keys()))

    def _load_extension(
        self,
        model_id: str,
        cls: Optional[type],
        manifest: dict,
        ext_dir: Path,
    ) -> None:
        try:
            if cls is None:
                if not _venv_python(ext_dir).exists():
                    raise RuntimeError(
                        "venv not found — extension needs setup. "
                        "Click 'Repair' on the Extensions page to run setup.py."
                    )
                gen = ExtensionProcess(ext_dir, manifest)
                gen.model_dir   = MODELS_DIR / model_id
                gen.outputs_dir = WORKSPACE_DIR
            else:
                gen = cls(MODELS_DIR / model_id, WORKSPACE_DIR)
                gen.hf_repo          = manifest.get("hf_repo", "")
                gen.hf_skip_prefixes = manifest.get("hf_skip_prefixes", [])
                gen.download_check   = manifest.get("download_check", "")
                gen._params_schema   = manifest.get("params_schema", [])

            self._generators[model_id] = gen
            self._manifests[model_id]  = manifest
            self._errors.pop(model_id, None)
        except Exception as exc:
            msg = str(exc)
            logger.error("Failed to instantiate '%s': %s", model_id, msg)
            self._errors[model_id] = msg

    def reload(self) -> None:
        """Re-scans all extensions and updates the registry hot."""
        logger.info("Reloading all extensions…")
        self.unload_all()
        self._generators.clear()
        self._manifests.clear()
        self._errors.clear()
        self.initialize()
        logger.info("Reload complete.")

    def reload_single(self, ext_id: str) -> None:
        """
        Reloads a single extension by its ID without touching others.
        Useful after a Repair or manual update of one extension.
        """
        logger.info("Reloading single extension: %s", ext_id)
        if ext_id in self._generators:
            try:
                gen = self._generators[ext_id]
                if isinstance(gen, ExtensionProcess):
                    gen.stop()
                else:
                    gen.unload()
            except Exception:
                pass
            del self._generators[ext_id]
            self._manifests.pop(ext_id, None)
            self._errors.pop(ext_id, None)

        extensions = _discover_extensions()
        entry = extensions.get(ext_id)
        if entry is None:
            logger.warning("Extension '%s' not found after reload.", ext_id)
            return
        cls, manifest, ext_dir = entry
        self._load_extension(ext_id, cls, manifest, ext_dir)
        logger.info("Extension '%s' reloaded.", ext_id)

    def load_errors(self) -> Dict[str, str]:
        return dict(self._errors)

    # ------------------------------------------------------------------ #
    # Generator access
    # ------------------------------------------------------------------ #

    def get_active(self) -> BaseGenerator:
        """Returns the active generator. Downloads and loads if necessary."""
        gen = self._generators[self._active_id]
        if not gen.is_loaded():
            if not gen.is_downloaded():
                if not isinstance(gen, ExtensionProcess):
                    gen._auto_download()
            gen.load()
        return gen

    def get_generator(self, model_id: str) -> BaseGenerator:
        if model_id not in self._generators:
            raise ValueError(
                f"Unknown model ID: '{model_id}'. "
                f"Available: {list(self._generators.keys())}"
            )
        return self._generators[model_id]

    def get_manifest(self, model_id: str) -> dict:
        if model_id not in self._manifests:
            raise KeyError(f"No manifest for model ID: '{model_id}'")
        return self._manifests[model_id]

    def switch_model(self, model_id: str) -> None:
        """Switches the active model. Unloads the previous one if different."""
        if model_id not in self._generators:
            raise ValueError(
                f"Unknown model ID: '{model_id}'. "
                f"Available: {list(self._generators.keys())}"
            )
        if model_id != self._active_id:
            if self._active_id in self._generators:
                self._generators[self._active_id].unload()
            self._active_id = model_id

    # ------------------------------------------------------------------ #
    # Text-to-3D helpers
    # ------------------------------------------------------------------ #

    def text_capable_ids(self) -> List[str]:
        """
        Returns the IDs of generators that support text-to-3D (generate_from_text).
        Works for both direct generators (checks supports_text attribute) and
        subprocess generators (checks manifest 'supports_text' flag).
        """
        result = []
        for model_id, gen in self._generators.items():
            manifest = self._manifests.get(model_id, {})
            # Direct generators: check class attribute
            if hasattr(gen, "supports_text") and gen.supports_text:
                result.append(model_id)
                continue
            # Subprocess generators: check manifest flag
            if manifest.get("supports_text", False):
                result.append(model_id)
        return result

    def get_text_generator(self) -> Optional[BaseGenerator]:
        """
        Returns the first available text-to-3D generator, or None.
        The generator is loaded (downloaded + loaded into GPU) on first call.
        """
        ids = self.text_capable_ids()
        if not ids:
            return None
        gen = self._generators[ids[0]]
        if not gen.is_loaded():
            if not gen.is_downloaded() and not isinstance(gen, ExtensionProcess):
                gen._auto_download()
            gen.load()
        return gen

    # ------------------------------------------------------------------ #
    # Status
    # ------------------------------------------------------------------ #

    def active_status(self) -> dict:
        gen      = self._generators[self._active_id]
        manifest = self._manifests[self._active_id]
        return {
            "id":         self._active_id,
            "name":       manifest.get("name", gen.DISPLAY_NAME),
            "downloaded": gen.is_downloaded(),
            "loaded":     gen.is_loaded(),
        }

    def all_status(self) -> list:
        result = []
        for model_id, gen in self._generators.items():
            manifest = self._manifests[model_id]
            result.append({
                "id":            model_id,
                "name":          manifest.get("name", gen.DISPLAY_NAME),
                "description":   manifest.get("description", ""),
                "version":       manifest.get("version", ""),
                "vram_gb":       manifest.get("vram_gb", gen.VRAM_GB),
                "hf_repo":       manifest.get("hf_repo", ""),
                "tags":          manifest.get("tags", []),
                "supports_text": manifest.get("supports_text", getattr(gen, "supports_text", False)),
                "downloaded":    gen.is_downloaded(),
                "loaded":        gen.is_loaded(),
                "active":        model_id == self._active_id,
            })
        return result

    def params_schema(self, model_id: Optional[str] = None) -> list:
        target_id = model_id or self._active_id
        if target_id not in self._generators:
            raise KeyError(target_id)
        return self._generators[target_id].params_schema()

    # ------------------------------------------------------------------ #
    # Paths update & shutdown
    # ------------------------------------------------------------------ #

    def update_paths(
        self,
        models_dir: Optional[Path],
        workspace_dir: Optional[Path],
    ) -> None:
        global MODELS_DIR, WORKSPACE_DIR
        import services.generator_registry as _self_module

        if models_dir is not None:
            self.unload_all()
            models_dir.mkdir(parents=True, exist_ok=True)
            _self_module.MODELS_DIR = models_dir
            for model_id, gen in self._generators.items():
                gen.model_dir = models_dir / model_id

        if workspace_dir is not None:
            workspace_dir.mkdir(parents=True, exist_ok=True)
            _self_module.WORKSPACE_DIR = workspace_dir
            for gen in self._generators.values():
                gen.outputs_dir = workspace_dir

    def unload_all(self) -> None:
        for gen in self._generators.values():
            try:
                if isinstance(gen, ExtensionProcess):
                    gen.stop()
                else:
                    gen.unload()
            except Exception as exc:
                logger.warning("Error unloading generator: %s", exc)


# Singleton
generator_registry = GeneratorRegistry()
