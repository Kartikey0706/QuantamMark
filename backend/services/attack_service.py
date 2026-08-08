"""Attack Lab service for applying image attacks to protected images."""

import io
import os
from typing import Dict, Optional

import numpy as np
from PIL import Image, ImageFilter

from .metrics_service import calculate_metrics
from .watermark_service import extract_lsb_watermark

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(os.path.dirname(BASE_DIR), "processed")
ATTACKS_DIR = os.path.join(PROCESSED_DIR, "attacks")

SUPPORTED_ATTACKS = {
    "jpeg_compression": "jpeg_compression",
    "gaussian_noise": "gaussian_noise",
    "rotation": "rotation",
    "crop": "crop",
    "blur": "blur",
}


def _ensure_directories() -> None:
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(ATTACKS_DIR, exist_ok=True)


def _resolve_image_path(filename: str) -> str:
    if not filename or not isinstance(filename, str):
        raise ValueError("Filename must be a non-empty string.")

    safe_name = os.path.basename(filename)
    candidate_paths = [
        os.path.join(PROCESSED_DIR, safe_name),
        os.path.join(ATTACKS_DIR, safe_name),
    ]
    for path in candidate_paths:
        if os.path.isfile(path):
            return path

    raise FileNotFoundError("Protected image not found.")


def _build_attacked_filename(filename: str, attack: str) -> str:
    base_name, ext = os.path.splitext(os.path.basename(filename))
    return f"{base_name}_{attack}{ext or '.png'}"


def _save_attacked_image(image: Image.Image, filename: str) -> str:
    _ensure_directories()
    target_path = os.path.join(ATTACKS_DIR, filename)
    image.save(target_path, format="PNG")
    return target_path


def _apply_jpeg_compression(image: Image.Image, quality: int = 70) -> Image.Image:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    with Image.open(buffer) as reloaded:
        return reloaded.convert("RGB")


def _apply_gaussian_noise(image: Image.Image, sigma: float = 8.0) -> Image.Image:
    image_array = np.array(image, dtype=np.float32)
    noise = np.random.normal(0, sigma, image_array.shape).astype(np.float32)
    attacked = np.clip(image_array + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(attacked, mode="RGB")


def _apply_rotation(image: Image.Image, angle: float = 5.0) -> Image.Image:
    return image.rotate(angle, resample=Image.BICUBIC, expand=False)


def _apply_crop(image: Image.Image, ratio: float = 0.15) -> Image.Image:
    width, height = image.size
    crop_width = max(1, int(width * (1 - ratio)))
    crop_height = max(1, int(height * (1 - ratio)))
    left = (width - crop_width) // 2
    top = (height - crop_height) // 2
    right = left + crop_width
    bottom = top + crop_height
    return image.crop((left, top, right, bottom)).resize((width, height), Image.BICUBIC)


def _apply_blur(image: Image.Image, radius: float = 2.0) -> Image.Image:
    return image.filter(ImageFilter.GaussianBlur(radius=radius))


def apply_attack(filename: str, attack: str, parameters: Optional[Dict[str, object]] = None) -> Dict[str, object]:
    """Create an attacked copy of a protected image and return the generated path."""
    if attack not in SUPPORTED_ATTACKS:
        raise ValueError(f"Unsupported attack: {attack}")

    _ensure_directories()
    source_path = _resolve_image_path(filename)
    params = parameters or {}

    with Image.open(source_path) as image:
        image = image.convert("RGB")
        if attack == "jpeg_compression":
            attacked_image = _apply_jpeg_compression(image, int(params.get("quality", 70)))
        elif attack == "gaussian_noise":
            attacked_image = _apply_gaussian_noise(image, float(params.get("sigma", 8.0)))
        elif attack == "rotation":
            attacked_image = _apply_rotation(image, float(params.get("angle", 5.0)))
        elif attack == "crop":
            attacked_image = _apply_crop(image, float(params.get("ratio", 0.15)))
        elif attack == "blur":
            attacked_image = _apply_blur(image, float(params.get("radius", 2.0)))
        else:
            raise ValueError(f"Unsupported attack: {attack}")

    attacked_filename = _build_attacked_filename(filename, attack)
    attacked_path = _save_attacked_image(attacked_image, attacked_filename)

    return {
        "success": True,
        "attack": attack,
        "filename": attacked_filename,
        "path": f"/processed/attacks/{attacked_filename}",
        "status": "created",
    }


def test_attack(filename: str, watermark: str, attack: str, parameters: Optional[Dict[str, object]] = None) -> Dict[str, object]:
    """Apply an attack and evaluate whether the watermark survives."""
    attack_result = apply_attack(filename, attack, parameters=parameters)
    attacked_path = os.path.join(ATTACKS_DIR, attack_result["filename"])
    original_path = _resolve_image_path(filename)

    try:
        extracted = extract_lsb_watermark(attacked_path)
        extracted_watermark = extracted.get("watermark", "")
        watermark_recovered = extracted_watermark == watermark
        verified = bool(watermark_recovered)
        recovery_status = "recovered" if watermark_recovered else "partial/corrupted"
        if not extracted_watermark:
            recovery_status = "not recovered"
    except Exception:
        extracted_watermark = ""
        watermark_recovered = False
        verified = False
        recovery_status = "not recovered"

    metrics = calculate_metrics(original_path, attacked_path, watermark_text=watermark)

    return {
        "success": True,
        "attack": attack,
        "watermark_recovered": watermark_recovered,
        "extracted_watermark": extracted_watermark,
        "verified": verified,
        "status": recovery_status,
        "metrics": metrics,
    }
