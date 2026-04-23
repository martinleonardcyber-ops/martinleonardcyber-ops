"""
TRELLIS generator — high-quality image-to-3D using Microsoft's SLAT model (2024).
Produces detailed meshes with PBR textures via Structured LATent representation.

Reference: https://github.com/microsoft/TRELLIS
HuggingFace: https://huggingface.co/microsoft/TRELLIS-image-large
"""
import io
import logging
import time
import threading
from pathlib import Path
from typing import Callable, Optional

from services.generators.base import BaseGenerator, GenerationCancelled

logger = logging.getLogger(__name__)


class TrellisGenerator(BaseGenerator):
    MODEL_ID     = "trellis"
    DISPLAY_NAME = "TRELLIS (Image → 3D + PBR Textures)"
    VRAM_GB      = 16

    def __init__(self, model_dir: Path, outputs_dir: Path) -> None:
        super().__init__(model_dir, outputs_dir)
        self._pipeline = None

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    def is_downloaded(self) -> bool:
        return (self.model_dir / "ckpts").exists()

    def load(self) -> None:
        if self._model is not None:
            return

        logger.info("[TRELLIS] Loading pipeline from %s…", self.model_dir)
        from trellis.pipelines import TrellisImageTo3DPipeline

        self._pipeline = TrellisImageTo3DPipeline.from_pretrained(str(self.model_dir))
        self._pipeline.cuda()
        self._model = self._pipeline
        logger.info("[TRELLIS] Pipeline loaded.")

    def unload(self) -> None:
        self._pipeline = None
        super().unload()
        logger.info("[TRELLIS] Unloaded.")

    # ------------------------------------------------------------------ #
    # Image-to-3D
    # ------------------------------------------------------------------ #

    def generate(
        self,
        image_bytes: bytes,
        params: dict,
        progress_cb: Optional[Callable[[int, str], None]] = None,
        cancel_event: Optional[threading.Event] = None,
    ) -> Path:
        from PIL import Image

        if not self.is_loaded():
            self.load()

        sparse_steps  = int(params.get("sparse_steps", 12))
        slat_steps    = int(params.get("slat_steps", 12))
        simplify      = float(params.get("simplify", 0.95))
        texture_size  = int(params.get("texture_size", 1024))

        self._report(progress_cb, 5, "Preparing image…")
        self._check_cancelled(cancel_event)

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        pil_image = self._remove_background(pil_image)

        self._report(progress_cb, 10, "Generating sparse 3D structure…")
        self._check_cancelled(cancel_event)

        outputs = self._pipeline.run(
            pil_image,
            seed=0,
            formats=["mesh"],
            preprocess_image=False,
            sparse_structure_sampler_params={
                "steps": sparse_steps,
                "cfg_strength": 7.5,
            },
            slat_sampler_params={
                "steps": slat_steps,
                "cfg_strength": 3.0,
            },
        )

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 70, f"Extracting mesh + baking {texture_size}px textures…")

        from trellis.utils import postprocessing_utils
        glb = postprocessing_utils.to_glb(
            outputs["gaussian"][0],
            outputs["mesh"][0],
            simplify=simplify,
            texture_size=texture_size,
        )

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 90, "Exporting GLB…")

        output_path = self._export_glb(glb)
        self._report(progress_cb, 100, "Done")
        logger.info("[TRELLIS] Saved → %s", output_path)
        return output_path

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _remove_background(self, image):
        try:
            import rembg
            return rembg.remove(image)
        except Exception as exc:
            logger.warning("[TRELLIS] Background removal skipped: %s", exc)
            return image

    def _export_glb(self, glb_obj) -> Path:
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        out = self.outputs_dir / f"trellis-{int(time.time())}.glb"
        glb_obj.export(str(out))
        return out
