"""
InstantMesh generator — fast image-to-3D via multi-view synthesis + LRM (2024).
TencentARC's model: generates 6 multi-view images with Zero123++ then
reconstructs a textured mesh with sparse-view LRM.

Reference: https://github.com/TencentARC/InstantMesh
HuggingFace: https://huggingface.co/TencentARC/InstantMesh
"""
import io
import logging
import time
import threading
from pathlib import Path
from typing import Callable, Optional

from services.generators.base import BaseGenerator, GenerationCancelled

logger = logging.getLogger(__name__)


class InstantMeshGenerator(BaseGenerator):
    MODEL_ID     = "instantmesh"
    DISPLAY_NAME = "InstantMesh (Fast Image → 3D)"
    VRAM_GB      = 8

    def __init__(self, model_dir: Path, outputs_dir: Path) -> None:
        super().__init__(model_dir, outputs_dir)
        self._mv_pipeline  = None   # Zero123++ multi-view pipeline
        self._rec_pipeline = None   # LRM reconstruction pipeline

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    def is_downloaded(self) -> bool:
        return (self.model_dir / "checkpoints").exists()

    def load(self) -> None:
        if self._model is not None:
            return

        import torch
        from diffusers import DiffusionPipeline
        from instantmesh.models.lrm import InstantMeshLRM

        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype  = torch.float16 if device == "cuda" else torch.float32

        logger.info("[InstantMesh] Loading Zero123++ pipeline…")
        self._mv_pipeline = DiffusionPipeline.from_pretrained(
            str(self.model_dir / "zero123plus"),
            custom_pipeline="zero123plus",
            torch_dtype=dtype,
        ).to(device)
        self._mv_pipeline.scheduler = self._mv_pipeline.scheduler.__class__.from_config(
            self._mv_pipeline.scheduler.config, timestep_spacing="trailing"
        )

        logger.info("[InstantMesh] Loading LRM reconstruction model…")
        self._rec_pipeline = InstantMeshLRM.from_pretrained(
            str(self.model_dir / "checkpoints"),
        ).to(device)

        self._device = device
        self._model  = self._mv_pipeline
        logger.info("[InstantMesh] Models loaded.")

    def unload(self) -> None:
        self._mv_pipeline  = None
        self._rec_pipeline = None
        super().unload()

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
        import torch
        from PIL import Image

        if not self.is_loaded():
            self.load()

        num_views    = int(params.get("num_views", 6))
        guidance     = float(params.get("guidance_scale", 4.0))
        steps        = int(params.get("num_steps", 75))
        export_texmap = bool(params.get("export_texmap", True))

        self._report(progress_cb, 5, "Preprocessing image…")
        self._check_cancelled(cancel_event)

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        pil_image = self._remove_background(pil_image)
        pil_image = pil_image.resize((320, 320))

        self._report(progress_cb, 10, f"Generating {num_views} multi-view images…")
        self._check_cancelled(cancel_event)

        with torch.no_grad():
            mv_result = self._mv_pipeline(
                pil_image,
                num_inference_steps=steps,
                guidance_scale=guidance,
            )
        mv_images = mv_result.images[0]

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 60, "Reconstructing 3D mesh (LRM)…")

        with torch.no_grad():
            mesh = self._rec_pipeline(
                mv_images,
                export_texmap=export_texmap,
            )

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 90, "Exporting GLB…")

        output_path = self._export_glb(mesh)
        self._report(progress_cb, 100, "Done")
        logger.info("[InstantMesh] Saved → %s", output_path)
        return output_path

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _remove_background(self, image):
        try:
            import rembg
            return rembg.remove(image)
        except Exception as exc:
            logger.warning("[InstantMesh] Background removal skipped: %s", exc)
            return image

    def _export_glb(self, mesh) -> Path:
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        out = self.outputs_dir / f"instantmesh-{int(time.time())}.glb"
        if hasattr(mesh, "export"):
            mesh.export(str(out))
        else:
            import trimesh, numpy as np
            verts = np.array(getattr(mesh, "vertices", getattr(mesh, "verts", [])))
            faces = np.array(mesh.faces)
            trimesh.Trimesh(vertices=verts, faces=faces).export(str(out))
        return out
