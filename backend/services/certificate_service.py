"""Digital ownership certificate service for Sprint 10."""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

import qrcode
from PIL import Image

from .metrics_service import calculate_metrics
from .qrng_service import generate_security_key
from .watermark_service import extract_lsb_watermark

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
CERTIFICATES_DIR = os.path.join(BACKEND_DIR, "certificates")
QR_DIR = os.path.join(CERTIFICATES_DIR, "qr")
STORE_PATH = os.path.join(CERTIFICATES_DIR, "index.json")


def _ensure_storage_dirs() -> None:
    os.makedirs(CERTIFICATES_DIR, exist_ok=True)
    os.makedirs(QR_DIR, exist_ok=True)


def _sanitize_filename(filename: str) -> str:
    if not filename or not isinstance(filename, str):
        raise ValueError("Filename must be a non-empty string.")
    safe_name = os.path.basename(filename)
    return re.sub(r"[^A-Za-z0-9._-]", "_", safe_name)


def _generate_id(prefix: str = "QM") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _load_store() -> Dict[str, Dict[str, object]]:
    _ensure_storage_dirs()
    if not os.path.isfile(STORE_PATH):
        return {}
    with open(STORE_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_store(store: Dict[str, Dict[str, object]]) -> None:
    _ensure_storage_dirs()
    with open(STORE_PATH, "w", encoding="utf-8") as handle:
        json.dump(store, handle, indent=2)


def _build_qr_path(verification_id: str) -> str:
    qr_path = os.path.join(QR_DIR, f"{verification_id}.png")
    return qr_path


def generate_certificate(protected_filename: str, watermark: str) -> Dict[str, object]:
    """Generate a local ownership certificate with metadata and QR output."""
    safe_protected = _sanitize_filename(protected_filename)
    safe_watermark = watermark.strip() if isinstance(watermark, str) and watermark.strip() else ""
    if not safe_watermark:
        raise ValueError("Watermark must be a non-empty string.")

    _ensure_storage_dirs()
    protected_path = os.path.join(BACKEND_DIR, "processed", safe_protected)
    if not os.path.isfile(protected_path):
        raise FileNotFoundError("Protected image not found.")

    metrics = calculate_metrics(os.path.join(BACKEND_DIR, "processed", safe_protected), protected_path, watermark_text=safe_watermark)
    try:
        extracted = extract_lsb_watermark(protected_path)
        recovered = extracted.get("watermark", "") == safe_watermark
    except Exception:
        recovered = False

    security_source = "secure_random_fallback"
    try:
        key_payload = generate_security_key(16)
        security_source = key_payload["source"]
    except Exception:
        pass

    certificate_id = _generate_id("QM")
    verification_id = _generate_id("QM")
    timestamp = datetime.now(timezone.utc).isoformat()

    certificate_payload = {
        "certificate_id": certificate_id,
        "verification_id": verification_id,
        "timestamp": timestamp,
        "original_filename": safe_protected,
        "protected_filename": safe_protected,
        "watermark": safe_watermark,
        "algorithm": "LSB",
        "watermark_length": len(safe_watermark),
        "embedded_bits": len(safe_watermark.encode("utf-8")) * 8,
        "psnr": metrics.get("psnr"),
        "ssim": metrics.get("ssim"),
        "entropy": metrics.get("entropy"),
        "embedding_time": metrics.get("embedding_time_ms"),
        "security_source": security_source,
        "verified": recovered,
    }

    store = _load_store()
    store[verification_id] = certificate_payload
    _save_store(store)

    qr_path = _build_qr_path(verification_id)
    qr = qrcode.make(f"http://localhost/verify.html?id={verification_id}")
    qr.save(qr_path)

    return {
        "success": True,
        "certificate_id": certificate_id,
        "verification_id": verification_id,
        "timestamp": timestamp,
        "certificate": certificate_payload,
        "qr_path": os.path.relpath(qr_path, BACKEND_DIR),
    }


def get_certificate(verification_id: str) -> Optional[Dict[str, object]]:
    """Retrieve certificate metadata by verification ID."""
    if not verification_id or not isinstance(verification_id, str):
        return None
    store = _load_store()
    return store.get(verification_id)


def verify_certificate(verification_id: str) -> Dict[str, object]:
    """Verify a certificate by ID and return metadata."""
    certificate = get_certificate(verification_id)
    if not certificate:
        return {"success": False, "verified": False, "error": "Certificate not found."}

    protected_path = os.path.join(BACKEND_DIR, "processed", certificate["protected_filename"])
    if os.path.isfile(protected_path):
        try:
            extracted = extract_lsb_watermark(protected_path)
            verified = extracted.get("watermark", "") == certificate.get("watermark")
        except Exception:
            verified = False
    else:
        verified = False

    certificate_copy = dict(certificate)
    certificate_copy["verified"] = verified
    return {
        "success": True,
        "verified": verified,
        "certificate": certificate_copy,
    }
