"""Setup script for the TRELLIS extension."""
import subprocess, sys
from pathlib import Path
EXT_DIR = Path(__file__).parent

def main() -> None:
    venv_dir = EXT_DIR / ".venv"
    print("[trellis setup] Creating virtual environment…")
    subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
    python = venv_dir / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    pip = [str(python), "-m", "pip", "install", "--upgrade"]
    print("[trellis setup] Upgrading pip…")
    subprocess.run(pip + ["pip"], check=True)
    print("[trellis setup] Installing dependencies (this may take several minutes)…")
    subprocess.run(pip + ["-r", str(EXT_DIR / "requirements.txt")], check=True)
    print("[trellis setup] Done. Model weights (~14 GB) will download on first use.")

if __name__ == "__main__":
    main()
