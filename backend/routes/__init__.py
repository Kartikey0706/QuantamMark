"""Routes package for backend."""

from .upload import upload_bp
from .watermark import watermark_bp
from .verify import verify_bp
from .attacks import attacks_bp
from .certificate import certificate_bp
from .metrics import metrics_bp
from .qrng import qrng_bp

__all__ = ["upload_bp", "watermark_bp", "verify_bp", "attacks_bp", "metrics_bp", "qrng_bp", "certificate_bp"]
