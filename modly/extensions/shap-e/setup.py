"""
Setup script for the Shap-E extension.
Creates a virtualenv and installs all dependencies.
Called automatically by Modly when the user clicks "Repair" or installs the extension.
"""
import subprocess
import sys
from pathlib import Path

EXT_DIR = Path(__file__).parent


def main() -> None:
    venv_dir = EXT_DIR / ".venv"

    print("[shap-e setup] Creating virtual environment…")
    subprocess.run(
        [sys.executable, "-m", "venv", str(venv_dir)],
        check=True,
    )

    python = venv_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    pip    = [str(python), "-m", "pip", "install", "--upgrade"]

    print("[shap-e setup] Installing dependencies…")
    subprocess.run(
        pip + ["pip"],
        check=True,
    )
    subprocess.run(
        pip + ["-r", str(EXT_DIR / "requirements.txt")],
        check=True,
    )

    print("[shap-e setup] Done. Shap-E extension is ready.")


if __name__ == "__main__":
    main()
