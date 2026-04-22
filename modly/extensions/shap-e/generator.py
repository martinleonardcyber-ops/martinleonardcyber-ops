"""
Shap-E generator — text-to-3D and image-to-3D using OpenAI's Shap-E model.
Requires: shap-e, torch, trimesh, Pillow (installed via setup.py venv).

Reference: https://github.com/openai/shap-e
HuggingFace: https://huggingface.co/openai/shap-e
"""
import io
import threading
import time
from pathlib import Path
from typing import Callable, Optional

# BaseGenerator is available at runtime via sys.path (injected by registry)
from services.generators.base import BaseGenerator, GenerationCancelled


class ShapEGenerator(BaseGenerator):
    MODEL_ID      = "shap-e"
    DISPLAY_NAME  = "Shap-E (Text to 3D)"
    VRAM_GB       = 6
    supports_text = True   # signals to registry that text-to-3D is available

    def __init__(self, model_dir: Path, outputs_dir: Path) -> None:
        super().__init__(model_dir, outputs_dir)
        self._xm       = None   # transmission decoder
        self._model_t  = None   # text model
        self._model_i  = None   # image model
        self._diffusion = None

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    def load(self) -> None:
        if self._model is not None:
            return

        import torch
        from shap_e.diffusion.sample import sample_latents
        from shap_e.models.download import load_model, load_config
        from shap_e.diffusion.gaussian_diffusion import diffusion_from_config

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self._xm       = load_model("transmitter",    device=device, cache_dir=str(self.model_dir))
        self._model_t  = load_model("text300M",       device=device, cache_dir=str(self.model_dir))
        self._model_i  = load_model("image300M",      device=device, cache_dir=str(self.model_dir))
        self._diffusion = diffusion_from_config(load_config("diffusion"))
        self._device   = device
        self._model    = self._xm  # keeps is_loaded() returning True

    def unload(self) -> None:
        self._xm       = None
        self._model_t  = None
        self._model_i  = None
        self._diffusion = None
        super().unload()

    def is_downloaded(self) -> bool:
        return (self.model_dir / "transmitter.pt").exists()

    # ------------------------------------------------------------------ #
    # Text-to-3D
    # ------------------------------------------------------------------ #

    def generate_from_text(
        self,
        prompt: str,
        params: dict,
        progress_cb: Optional[Callable[[int, str], None]] = None,
        cancel_event: Optional[threading.Event] = None,
    ) -> Path:
        import torch
        from shap_e.diffusion.sample import sample_latents
        from shap_e.util.notebooks import decode_latent_mesh

        if not self.is_loaded():
            self.load()

        guidance_scale = float(params.get("guidance_scale", 15.0))
        num_steps      = int(params.get("num_steps", 64))
        render_size    = int(params.get("render_size", 128))

        self._report(progress_cb, 5, f"Sampling latents for "{prompt}"…")
        self._check_cancelled(cancel_event)

        batch_size = 1
        latents = sample_latents(
            batch_size=batch_size,
            model=self._model_t,
            diffusion=self._diffusion,
            guidance_scale=guidance_scale,
            model_kwargs={"texts": [prompt] * batch_size},
            progress=False,
            clip_denoised=True,
            use_fp16=True,
            use_karras=True,
            karras_steps=num_steps,
            sigma_min=1e-3,
            sigma_max=160,
            s_churn=0,
        )

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 70, "Decoding mesh…")

        t = decode_latent_mesh(self._xm, latents[0]).tri_mesh()

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 85, "Exporting GLB…")

        output_path = self._write_glb(t, prompt)
        self._report(progress_cb, 100, "Done")
        return output_path

    # ------------------------------------------------------------------ #
    # Image-to-3D (bonus — same model, image conditioning)
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
        from shap_e.diffusion.sample import sample_latents
        from shap_e.util.notebooks import decode_latent_mesh
        from shap_e.util.image_util import load_image

        if not self.is_loaded():
            self.load()

        guidance_scale = float(params.get("guidance_scale", 3.0))
        num_steps      = int(params.get("num_steps", 64))

        self._report(progress_cb, 5, "Preparing image…")
        self._check_cancelled(cancel_event)

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

        self._report(progress_cb, 10, "Sampling latents from image…")
        self._check_cancelled(cancel_event)

        latents = sample_latents(
            batch_size=1,
            model=self._model_i,
            diffusion=self._diffusion,
            guidance_scale=guidance_scale,
            model_kwargs={"images": [pil_image]},
            progress=False,
            clip_denoised=True,
            use_fp16=True,
            use_karras=True,
            karras_steps=num_steps,
            sigma_min=1e-3,
            sigma_max=160,
            s_churn=0,
        )

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 75, "Decoding mesh…")

        t = decode_latent_mesh(self._xm, latents[0]).tri_mesh()

        self._check_cancelled(cancel_event)
        self._report(progress_cb, 90, "Exporting GLB…")

        output_path = self._write_glb(t, "image")
        self._report(progress_cb, 100, "Done")
        return output_path

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _write_glb(self, tri_mesh, label: str) -> Path:
        """Converts a Shap-E TriMesh to a .glb file and saves it."""
        import trimesh
        import numpy as np

        vertices = np.array(tri_mesh.verts)
        faces    = np.array(tri_mesh.faces)

        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)

        # Optionally transfer vertex colours if present
        if hasattr(tri_mesh, "vertex_channels") and tri_mesh.vertex_channels:
            try:
                r = np.array(tri_mesh.vertex_channels.get("R", []))
                g = np.array(tri_mesh.vertex_channels.get("G", []))
                b = np.array(tri_mesh.vertex_channels.get("B", []))
                if len(r) == len(vertices):
                    colors = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
                    ones   = np.full((len(colors), 1), 255, dtype=np.uint8)
                    mesh.visual.vertex_colors = np.concatenate([colors, ones], axis=-1)
            except Exception:
                pass

        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        slug = label[:32].replace(" ", "_").replace("/", "-")
        out  = self.outputs_dir / f"shap-e-{slug}-{int(time.time())}.glb"
        mesh.export(str(out))
        return out
