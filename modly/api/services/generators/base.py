"""
BaseGenerator — contract that each model adapter must implement.
"""
from abc import ABC, abstractmethod
import threading
from pathlib import Path
from typing import Callable, Optional


class GenerationCancelled(Exception):
    """Raised by generators when a cancel_event is set mid-generation."""


def smooth_progress(
    progress_cb: Callable[[int, str], None],
    start: int,
    end: int,
    label: str,
    stop: threading.Event,
    interval: float = 3.0,
) -> None:
    """
    Smoothly increments progress between start and end while a
    long-running operation runs without being able to emit callbacks.
    Stops as soon as stop is set.
    """
    current   = start
    max_reach = end - 2
    increment = max(1, (end - start) // 10)

    while current < max_reach and not stop.is_set():
        stop.wait(interval)
        if stop.is_set():
            break
        current = min(current + increment, max_reach)
        progress_cb(current, label)


class BaseGenerator(ABC):
    # ------------------------------------------------------------------ #
    # Metadata — override in each subclass
    # ------------------------------------------------------------------ #
    MODEL_ID:      str  = ""
    DISPLAY_NAME:  str  = ""
    VRAM_GB:       int  = 0    # Minimum recommended VRAM (in GB)
    supports_text: bool = False  # True if generate_from_text() is implemented

    def __init__(self, model_dir: Path, outputs_dir: Path) -> None:
        self.model_dir         = model_dir
        self.outputs_dir       = outputs_dir
        self._model            = None
        # Injected by the registry from the manifest
        self.hf_repo:          str  = ""
        self.hf_skip_prefixes: list = []
        self.download_check:   str  = ""
        self._params_schema:   list = []

    # ------------------------------------------------------------------ #
    # Model lifecycle
    # ------------------------------------------------------------------ #

    def is_downloaded(self) -> bool:
        if self.download_check:
            return (self.model_dir / self.download_check).exists()
        return self.model_dir.exists() and any(self.model_dir.iterdir())

    @abstractmethod
    def load(self) -> None:
        """Load the model into memory (GPU/CPU)."""
        ...

    def unload(self) -> None:
        """Release memory. Can be overridden if needed."""
        self._model = None
        import gc
        gc.collect()
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass
        try:
            import ctypes, sys
            if sys.platform == "win32":
                kernel32 = ctypes.windll.kernel32
                kernel32.SetProcessWorkingSetSizeEx(
                    kernel32.GetCurrentProcess(), -1, -1, 0
                )
        except Exception:
            pass

    def is_loaded(self) -> bool:
        return self._model is not None

    # ------------------------------------------------------------------ #
    # Inference — image-to-3D (required)
    # ------------------------------------------------------------------ #

    @abstractmethod
    def generate(
        self,
        image_bytes: bytes,
        params: dict,
        progress_cb: Optional[Callable[[int, str], None]] = None,
        cancel_event: Optional[threading.Event] = None,
    ) -> Path:
        """
        Generate a 3D mesh from an image.
        Returns the path to the generated .glb file.
        progress_cb(percent: int, step_label: str)
        """
        ...

    # ------------------------------------------------------------------ #
    # Inference — text-to-3D (optional)
    # ------------------------------------------------------------------ #

    def generate_from_text(
        self,
        prompt: str,
        params: dict,
        progress_cb: Optional[Callable[[int, str], None]] = None,
        cancel_event: Optional[threading.Event] = None,
    ) -> Path:
        """
        Generate a 3D mesh from a text prompt.
        Override in subclasses that support text-to-3D.
        Raises NotImplementedError by default.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support text-to-3D generation. "
            "Install a compatible text-to-3D extension."
        )

    # ------------------------------------------------------------------ #
    # Cancellation helper
    # ------------------------------------------------------------------ #

    def _check_cancelled(self, cancel_event: Optional[threading.Event]) -> None:
        """Raises GenerationCancelled if cancel_event is set."""
        if cancel_event and cancel_event.is_set():
            raise GenerationCancelled()

    # ------------------------------------------------------------------ #
    # Parameter schema (for the UI)
    # ------------------------------------------------------------------ #

    def params_schema(self) -> list:
        return self._params_schema

    # ------------------------------------------------------------------ #
    # Download with progress
    # ------------------------------------------------------------------ #

    def _auto_download(
        self,
        progress_cb: Optional[Callable[[int, str], None]] = None,
    ) -> None:
        """
        Downloads weights from self.hf_repo (injected by the registry).
        Optionally reports progress via progress_cb.
        """
        if not self.hf_repo:
            raise RuntimeError(
                f"[{self.MODEL_ID}] Cannot download: hf_repo not configured. "
                "Check the extension's manifest.json."
            )

        from huggingface_hub import snapshot_download

        print(f"[{self.__class__.__name__}] Downloading {self.hf_repo} → {self.model_dir} …")
        if progress_cb:
            progress_cb(0, f"Downloading {self.DISPLAY_NAME or self.MODEL_ID}…")

        self.model_dir.mkdir(parents=True, exist_ok=True)

        ignore = list(self.hf_skip_prefixes) + [
            "*.md", "LICENSE", "NOTICE", "Notice.txt", ".gitattributes",
        ]
        snapshot_download(
            repo_id=self.hf_repo,
            local_dir=str(self.model_dir),
            ignore_patterns=ignore,
        )
        print(f"[{self.__class__.__name__}] Download complete.")
        if progress_cb:
            progress_cb(10, "Download complete, loading…")

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _report(
        self,
        progress_cb: Optional[Callable[[int, str], None]],
        pct: int,
        step: str,
    ) -> None:
        if progress_cb:
            progress_cb(pct, step)
