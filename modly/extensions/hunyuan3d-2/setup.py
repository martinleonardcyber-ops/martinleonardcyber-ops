"""
Setup script for the Hunyuan3D 2.0 extension.
Creates a virtualenv and installs all dependencies including hy3dgen from GitHub.
Called automatically by Modly when the user clicks "Repair" or installs the extension.
"""
import subprocess
import sys
from pathlib import Path

EXT_DIR = Path(__file__).parent


def main() -> None:
    venv_dir = EXT_DIR / ".venv"

    print("[hunyuan3d-2 setup] Creating virtual environment…")
    subprocess.run(
        [sys.executable, "-m", "venv", str(venv_dir)],
        check=True,
    )

    python = venv_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    pip    = [str(python), "-m", "pip", "install", "--upgrade"]

    print("[hunyuan3d-2 setup] Upgrading pip…")
    subprocess.run(pip + ["pip"], check=True)

    print("[hunyuan3d-2 setup] Installing dependencies (this may take a few minutes)…")
    subprocess.run(
        pip + ["-r", str(EXT_DIR / "requirements.txt")],
        check=True,
    )

    print("[hunyuan3d-2 setup] Done. Hunyuan3D 2.0 extension is ready.")
    print("[hunyuan3d-2 setup] Note: model weights (~10 GB) will be downloaded on first use.")


if __name__ == "__main__":
    main()
