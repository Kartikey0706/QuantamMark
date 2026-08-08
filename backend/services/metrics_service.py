"""Sprint 7 metrics service for image quality and watermark capacity analysis."""

import math
import os
from typing import Dict, Optional

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim_metric

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")
PROCESSED_DIR = os.path.join(os.path.dirname(BASE_DIR), "processed")


def _ensure_image_path(path: str) -> str:
    if not path or not isinstance(path, str):
        raise ValueError("Image path must be a non-empty string.")

    resolved = os.path.abspath(path)
    if os.path.isfile(resolved):
        return resolved

    if os.path.isfile(os.path.join(UPLOADS_DIR, os.path.basename(path))):
        return os.path.join(UPLOADS_DIR, os.path.basename(path))

    if os.path.isfile(os.path.join(PROCESSED_DIR, os.path.basename(path))):
        return os.path.join(PROCESSED_DIR, os.path.basename(path))

    raise FileNotFoundError("Image file not found.")


def _load_image(path: str) -> Image.Image:
    resolved = _ensure_image_path(path)
    try:
        with Image.open(resolved) as image:
            return image.convert("RGB")
    except (ValueError, OSError) as exc:
        raise ValueError("Invalid image file.") from exc


def _image_entropy(image: Image.Image) -> float:
    grayscale = np.array(image.convert("L"), dtype=np.uint8)
    hist, _ = np.histogram(grayscale, bins=256, range=(0, 256))
    hist = hist[hist > 0]
    probabilities = hist / hist.sum()
    return float(-np.sum(probabilities * np.log2(probabilities)))


def _calculate_psnr(original: Image.Image, processed: Image.Image) -> float:
    if original.size != processed.size:
        raise ValueError("Original and processed images must have the same dimensions.")

    original_array = np.array(original, dtype=np.float64)
    processed_array = np.array(processed, dtype=np.float64)
    mse = np.mean((original_array - processed_array) ** 2)
    if mse == 0:
        return float("inf")
    return float(10.0 * math.log10((255.0 ** 2) / mse))


def _calculate_ssim(original: Image.Image, processed: Image.Image) -> float:
    if original.size != processed.size:
        raise ValueError("Original and processed images must have the same dimensions.")

    original_array = np.array(original, dtype=np.float64)
    processed_array = np.array(processed, dtype=np.float64)
    min_dimension = min(original_array.shape[0], original_array.shape[1])
    win_size = min(7, min_dimension if min_dimension % 2 == 1 else min_dimension - 1)
    if win_size < 3:
        win_size = 3
    return float(
        ssim_metric(
            original_array,
            processed_array,
            data_range=255.0,
            win_size=win_size,
            channel_axis=-1,
        )
    )


def _watermark_bits(watermark_text: str, delimiter: str = "<<<END>>>") -> int:
    payload = f"{watermark_text}{delimiter}"
    encoded = payload.encode("utf-8")
    return len(encoded) * 8


def calculate_metrics(
    original_path: str,
    processed_path: str,
    watermark_text: Optional[str] = None,
    embedding_time_ms: Optional[float] = None,
) -> Dict[str, float]:
    """Calculate PSNR, SSIM, entropy, embedding time, and capacity usage metrics."""
    original_image = _load_image(original_path)
    processed_image = _load_image(processed_path)

    psnr = _calculate_psnr(original_image, processed_image)
    ssim = _calculate_ssim(original_image, processed_image)
    entropy = _image_entropy(processed_image)

    width, height = processed_image.size
    capacity_bits = width * height * 3

    watermark_length = 0
    embedded_bits = 0
    capacity_used_percent = 0.0

    if watermark_text:
        watermark_length = len(f"{watermark_text}<<<END>>>")
        embedded_bits = _watermark_bits(watermark_text)
        if capacity_bits > 0:
            capacity_used_percent = min(100.0, (embedded_bits / capacity_bits) * 100.0)

    return {
        "psnr": psnr,
        "ssim": ssim,
        "entropy": entropy,
        "embedding_time_ms": float(embedding_time_ms or 0.0),
        "watermark_length": watermark_length,
        "embedded_bits": embedded_bits,
        "capacity_bits": capacity_bits,
        "capacity_used_percent": capacity_used_percent,
    }


def record_metric(*args, **kwargs):
    """Compatibility wrapper for existing imports."""
    return calculate_metrics(*args, **kwargs)

