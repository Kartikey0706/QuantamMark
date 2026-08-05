"""Upload route: handles image uploads and validation."""
import os
from flask import Blueprint, request, current_app, jsonify

from ..services.image_service import validate_image, save_image

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/upload", methods=["POST"])
def upload_image():
    """Accept multipart image, validate, and save to uploads/.

    Returns JSON only.
    """
    try:
        if "image" not in request.files:
            return jsonify({"success": False, "error": "No image file provided."}), 400

        file = request.files["image"]
        # Validate image
        valid, message = validate_image(file)
        if not valid:
            return jsonify({"success": False, "error": message}), 400

        # Save image to uploads directory
        filename = save_image(file)
        path = os.path.join("backend", "uploads", filename).replace("\\", "/")

        return jsonify({"success": True, "filename": filename, "path": path}), 201

    except Exception as e:
        current_app.logger.exception("Error during image upload")
        return jsonify({"success": False, "error": "Internal server error."}), 500
