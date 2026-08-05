"""Image helper functions: validation and saving.

This module avoids using the deprecated `imghdr` module and verifies
images using Pillow, which is compatible with Python 3.13.
"""
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")


def _allowed_extension(filename):
    allowed = {"png", "jpg", "jpeg", "bmp", "gif", "tiff"}
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in allowed


def validate_image(file_storage):
    """Validate uploaded file is an image using Pillow.

    Returns (True, message) on success or (False, error_message) on failure.
    """
    filename = getattr(file_storage, "filename", None)
    if not filename:
        return False, "Empty filename."

    if not _allowed_extension(filename):
        return False, "File extension not allowed."

    # Use Pillow to verify image integrity. Reset stream position before
    # and after verification so callers can still read/save the file.
    try:
        try:
            file_storage.stream.seek(0)
        except Exception:
            # Some file-like objects may not support seek; continue anyway
            pass

        with Image.open(file_storage.stream) as img:
            img.verify()

        try:
            file_storage.stream.seek(0)
        except Exception:
            pass

        return True, "OK"
    except Exception:
        try:
            file_storage.stream.seek(0)
        except Exception:
            pass
        return False, "Uploaded file is not a valid image."


def save_image(file_storage):
    """Save uploaded file to the uploads directory and return saved filename."""
    if not os.path.exists(UPLOADS_DIR):
        os.makedirs(UPLOADS_DIR, exist_ok=True)

    original = secure_filename(file_storage.filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    name, ext = os.path.splitext(original)
    saved_name = f"{name}_{timestamp}{ext}"
    path = os.path.join(UPLOADS_DIR, saved_name)

    # Ensure stream is at beginning before saving
    try:
        file_storage.stream.seek(0)
    except Exception:
        pass

    # Save file stream
    file_storage.save(path)

    return saved_name
