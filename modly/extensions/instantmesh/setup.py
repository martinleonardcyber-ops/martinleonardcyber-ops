"""Setup script for the InstantMesh extension."""
import subprocess, sys
from pathlib import Path
EXT_DIR = Path(__file__).parent

def main() -> None:
    venv_dir = EXT_DIR / ".venv"
    print("[instantmesh setup] Creating virtual environment…")
    subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
    python = venv_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    pip = [str(python), "-m", "pip", "install", "--upgrade"]
    print("[instantmesh setup] Upgrading pip…")
    subprocess.run(pip + ["pip"], check=True)
    print("[instantmesh setup] Installing dependencies…")
    subprocess.run(pip + ["-r", str(EXT_DIR / "requirements.txt")], check=True)
    print("[instantmesh setup] Done. Model weights (~5 GB) will download on first use.")

if __name__ == "__main__":
    main()
