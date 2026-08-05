"""Routes package for backend."""

from .upload import upload_bp
from .watermark import watermark_bp
from .verify import verify_bp
from .attacks import attacks_bp

__all__ = ["upload_bp", "watermark_bp", "verify_bp", "attacks_bp"]
