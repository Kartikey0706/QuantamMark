"""QRNG routes for Sprint 9."""

import os
from flask import Blueprint, current_app, jsonify, request

from ..services.qrng_service import generate_security_key

qrng_bp = Blueprint("qrng", __name__)


@qrng_bp.route("/qrng/key", methods=["POST"])
def generate_key_route():
    """Return a generated security key using QRNG or secure fallback."""
    try:
        data = request.get_json(silent=True) or {}
        length = data.get("length", 32)

        if not isinstance(length, int):
            return jsonify({"success": False, "error": "Length must be an integer."}), 400
        if length < 16 or length > 256:
            return jsonify({"success": False, "error": "Length must be between 16 and 256 bytes."}), 400

        payload = generate_security_key(length=length)
        return jsonify({
            "success": True,
            "source": payload["source"],
            "key_length": length,
            "key": payload["key"],
        }), 200
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error generating QRNG key")
        return jsonify({"success": False, "error": "Internal server error."}), 500
