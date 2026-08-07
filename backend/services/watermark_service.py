"""Watermark service for Sprint 5: Least Significant Bit embedding."""

import os
from typing import Dict, List, Tuple

from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")
PROCESSED_DIR = os.path.join(os.path.dirname(BASE_DIR), "processed")
DELIMITER = "<<<END>>>"


def _ensure_directories():
    """Ensure the uploads and processed folders exist."""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)


def _build_processed_filename(original_filename: str) -> str:
    """Create a protected filename with a fixed PNG extension."""
    base_name = os.path.splitext(original_filename)[0]
    return f"protected_{base_name}.png"


def _watermark_text_to_bits(watermark_text: str, delimiter: str = DELIMITER) -> Tuple[str, List[int]]:
    """Convert watermark text plus delimiter into a list of UTF-8 bits."""
    payload = f"{watermark_text}{delimiter}"
    encoded = payload.encode("utf-8")
    bits: List[int] = []
    for byte in encoded:
        bits.extend([(byte >> shift) & 1 for shift in range(7, -1, -1)])
    return payload, bits


def _normalize_image(image: Image.Image) -> Image.Image:
    """Convert the image to RGB or RGBA for reliable LSB embedding."""
    if image.mode == "RGBA":
        return image.copy()
    if image.mode == "RGB":
        return image.copy()
    if "A" in image.mode:
        return image.convert("RGBA")
    return image.convert("RGB")


def _calculate_capacity(image: Image.Image) -> int:
    """Return the maximum number of bits that can be embedded in the image."""
    width, height = image.size
    return width * height * 3


def _embed_bits_in_image(image: Image.Image, bits: List[int]) -> Image.Image:
    """Embed LSB bits into the RGB pixels of the image."""
    if not bits:
        return image.copy()

    target_image = _normalize_image(image)
    width, height = target_image.size
    pixels = target_image.load()
    bit_index = 0
    mode_has_alpha = target_image.mode == "RGBA"

    for y in range(height):
        for x in range(width):
            pixel = list(pixels[x, y])
            for channel in range(3):
                if bit_index >= len(bits):
                    break
                pixel[channel] = (pixel[channel] & ~1) | bits[bit_index]
                bit_index += 1
            pixels[x, y] = tuple(pixel)
            if bit_index >= len(bits):
                return target_image

    raise ValueError("Watermark bits exceed image capacity.")


def embed_lsb_watermark(filename: str, watermark_text: str) -> Dict[str, object]:
    """Embed watermark text into an uploaded image using LSB steganography."""
    if not watermark_text or not isinstance(watermark_text, str):
        raise ValueError("Watermark text must be a non-empty string.")

    if not filename or not isinstance(filename, str):
        raise ValueError("Filename must be a non-empty string.")

    safe_name = os.path.basename(filename)
    _ensure_directories()
    upload_path = os.path.join(UPLOADS_DIR, safe_name)
    if not os.path.isfile(upload_path):
        raise FileNotFoundError("Uploaded image not found.")

    payload, bits = _watermark_text_to_bits(watermark_text)

    with Image.open(upload_path) as image:
        normalized_image = _normalize_image(image)
        capacity = _calculate_capacity(normalized_image)
        if len(bits) > capacity:
            raise ValueError(
                f"Watermark too large for image capacity ({capacity} bits available, "
                f"requires {len(bits)} bits)."
            )

        protected_image = _embed_bits_in_image(normalized_image, bits)

    processed_filename = _build_processed_filename(filename)
    processed_path = os.path.join(PROCESSED_DIR, processed_filename)
    protected_image.save(processed_path, format="PNG")

    return {
        "processed_image": f"/processed/{processed_filename}",
        "processed_filename": processed_filename,
        "algorithm": "LSB",
        "watermark_length": len(payload),
        "embedded_bits": len(bits),
    }

def extract_lsb_watermark(image_path: str) -> dict:
    """Extract an LSB watermark from a processed image file."""
    if not image_path or not isinstance(image_path, str):
        raise ValueError("Image path must be a non-empty string.")

    safe_name = os.path.basename(image_path)
    _ensure_directories()

    candidate_paths = []
    if os.path.isabs(image_path) and os.path.isfile(image_path):
        candidate_paths.append(image_path)
    else:
        if os.path.isfile(image_path):
            candidate_paths.append(image_path)
        candidate_paths.append(os.path.join(PROCESSED_DIR, safe_name))

    protected_path = next((path for path in candidate_paths if os.path.isfile(path)), None)
    if not protected_path:
        raise FileNotFoundError("Protected image not found.")

    delimiter_bytes = DELIMITER.encode("utf-8")
    extracted_bytes = bytearray()
    current_byte = 0
    bit_count = 0

    try:
        with Image.open(protected_path) as image:
            normalized_image = _normalize_image(image)
            pixels = normalized_image.load()
            width, height = normalized_image.size

            for y in range(height):
                for x in range(width):
                    pixel = pixels[x, y]
                    for channel in range(3):
                        current_byte = (current_byte << 1) | (pixel[channel] & 1)
                        bit_count += 1
                        if bit_count == 8:
                            extracted_bytes.append(current_byte)
                            bit_count = 0
                            current_byte = 0

                            if len(extracted_bytes) >= len(delimiter_bytes) and extracted_bytes[-len(delimiter_bytes):] == delimiter_bytes:
                                payload_bytes = extracted_bytes[:-len(delimiter_bytes)]
                                try:
                                    watermark = payload_bytes.decode("utf-8")
                                except UnicodeDecodeError as exc:
                                    raise ValueError("Corrupted watermark: invalid UTF-8 sequence.") from exc

                                return {
                                    "success": True,
                                    "watermark": watermark,
                                    "algorithm": "LSB",
                                }
    except OSError as exc:
        raise ValueError("Invalid image file.") from exc

    raise ValueError("No embedded watermark found.")

def create_watermark(filename: str, watermark_text: str):
    """
    Backward compatibility wrapper.
    Existing code can still call create_watermark().
    """
    return embed_lsb_watermark(filename, watermark_text)