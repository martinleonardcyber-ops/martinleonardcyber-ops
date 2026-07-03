"""
Hunyuan3D 2.0 generator — high-quality image-to-3D with full PBR textures.
Tencent's state-of-the-art open-source model (2024).

Shape pipeline: ~8 GB VRAM
Texture pipeline: +4 GB VRAM (~12 GB total)

Reference: https://github.com/Tencent/Hunyuan3D-2
HuggingFace: https://huggingface.co/tencent/Hunyuan3D-2
"""
import io
import logging
import time
import threading
from pathlib import Path
from typing import Callable, Optional

from services.generators.base import BaseGenerator, GenerationCancelled

logger = logging.getLogger(__name__)


class Hunyuan3Dv2Generator(BaseGenerator):
    MODEL_ID     = "hunyuan3d-2"
    DISPLAY_NAME = "Hunyuan3D 2.0 (Image → 3D + PBR Textures)"
    VRAM_GB      = 12

    def __init__(self, model_dir: Path, outputs_dir: Path) -> None:
        super().__init__(model_dir, outputs_dir)
        self._shape_pipeline = None
        self._paint_pipeline = None
        self._device         = "cpu"

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    def is_downloaded(self) -> bool:
        return (self.model_dir / "hunyuan3d-dit-v2-0").exists()

    def load(self) -> None:
        if self._model is not None:
            return

        import torch
        from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
        from hy3dgen.texgen import Hunyuan3DPaintPipeline

        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if self._device == "cuda" else torch.float32

        logger.info("[Hunyuan3D-2] Loading shape pipeline on %s…", self._device)
        self._shape_pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
            str(self.model_dir),
            torch_dtype=dtype,
        ).to(self._device)

        logger.info("[Hunyuan3D-2] Loading texture pipeline…")
        self._paint_pipeline = Hunyuan3DPaintPipeline.from_pretrained(
            str(self.model_dir),
        )

        self._model = self._shape_pipeline
        logger.info("[Hunyuan3D-2] Models loaded.")

    def unload(self) -> None:
        self._shape_pipeline = None
        self._paint_pipeline = None
        super().unload()
        logger.info("[Hunyuan3D-2] Unloaded.")

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

        steps      = int(params.get("num_steps", 50))
        guidance   = float(params.get("guidance_scale", 7.5))
        do_texture = bool(params.get("texture", True))
        remove_bg  = bool(params.get("remove_bg", True))

        self._report(progress_cb, 5, "Preparing image…")
        self._check_cancelled(cancel_event)

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

        if remove_bg:
            self._report(progress_cb, 8, "Removing background…")
            pil_image = self._remove_background(pil_image)

        pil_image = pil_image.convert("RGB")

        self._report(progress_cb, 12, "Generating 3D shape…")
        self._check_cancelled(cancel_event)

        result = self._shape_pipeline(
            image=pil_image,
            num_inference_steps=steps,
            guidance_scale=guidance,
        )
        mesh = result[0]

        self._check_cancelled(cancel_event)

        if do_texture and self._paint_pipeline is not None:
            self._report(progress_cb, 65, "Painting PBR textures (albedo · roughness · normal)…")
            self._check_cancelled(cancel_event)
            try:
                mesh = self._paint_pipeline(mesh, image=pil_image)
                logger.info("[Hunyuan3D-2] Texture step complete.")
            except Exception as exc:
                logger.warning(
                    "[Hunyuan3D-2] Texture step failed (%s) — exporting untextured mesh.", exc
                )

        self._report(progress_cb, 88, "Exporting GLB…")
        self._check_cancelled(cancel_event)

        output_path = self._export_glb(mesh)
        self._report(progress_cb, 100, "Done")
        logger.info("[Hunyuan3D-2] Saved → %s", output_path)
        return output_path

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    def _remove_background(self, image):
        """Removes the image background using rembg."""
        try:
            import rembg
            return rembg.remove(image)
        except ImportError:
            logger.warning("[Hunyuan3D-2] rembg not installed — skipping background removal.")
            return image
        except Exception as exc:
            logger.warning("[Hunyuan3D-2] Background removal failed (%s) — using original image.", exc)
            return image

    def _export_glb(self, mesh) -> Path:
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        out = self.outputs_dir / f"hunyuan3d-2-{int(time.time())}.glb"

        # Hunyuan3D-2 mesh objects expose .export() directly
        if hasattr(mesh, "export"):
            mesh.export(str(out))
            return out

        # Fallback: convert via trimesh
        import trimesh
        import numpy as np

        verts = np.array(getattr(mesh, "verts", getattr(mesh, "vertices", [])))
        faces = np.array(mesh.faces)
        tm = trimesh.Trimesh(vertices=verts, faces=faces)

        if hasattr(mesh, "vertex_channels") and mesh.vertex_channels:
            try:
                r = np.array(mesh.vertex_channels.get("R", []))
                g = np.array(mesh.vertex_channels.get("G", []))
                b = np.array(mesh.vertex_channels.get("B", []))
                if len(r) == len(verts):
                    colors = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
                    alpha  = np.full((len(colors), 1), 255, dtype=np.uint8)
                    tm.visual.vertex_colors = np.concatenate([colors, alpha], axis=-1)
            except Exception:
                pass

        tm.export(str(out))
        return out
