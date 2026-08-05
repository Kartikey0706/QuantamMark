"""Helper utilities for the backend."""
import os
from werkzeug.utils import secure_filename


def ensure_dirs(paths):
    """Ensure each path in `paths` exists (create if missing)."""
    for p in paths:
        try:
            os.makedirs(p, exist_ok=True)
        except Exception:
            # Best-effort directory creation; caller will handle errors later
            pass


def safe_filename(filename: str) -> str:
    """Return a filesystem-safe filename."""
    return secure_filename(filename)
