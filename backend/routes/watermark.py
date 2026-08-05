"""Watermarking routes for Sprint 5: LSB embedding."""
import os
from flask import Blueprint, request, jsonify, current_app

from ..services.watermark_service import embed_lsb_watermark, extract_lsb_watermark

watermark_bp = Blueprint("watermark", __name__)


@watermark_bp.route("/watermark/embed", methods=["POST"])
def embed_watermark():
    """Embed a text watermark into an uploaded image using LSB."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        watermark_text = data.get("watermark_text")

        if not filename:
            return jsonify({"success": False, "error": "Filename is required."}), 400
        if not watermark_text:
            return jsonify({"success": False, "error": "Watermark text is required."}), 400

        result = embed_lsb_watermark(filename, watermark_text)
        return jsonify({"success": True, **result}), 200

    except FileNotFoundError:
        return jsonify({"success": False, "error": "Image file not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error embedding watermark")
        return jsonify({"success": False, "error": "Internal server error."}), 500


@watermark_bp.route("/watermark/extract", methods=["POST"])
def extract_watermark():
    """Extract an embedded LSB watermark from a processed image."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")

        if not filename:
            return jsonify({"success": False, "error": "Filename is required."}), 400

        result = extract_lsb_watermark(filename)
        return jsonify(result), 200

    except FileNotFoundError:
        return jsonify({"success": False, "error": "Protected image not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error extracting watermark")
        return jsonify({"success": False, "error": "Internal server error."}), 500


@watermark_bp.route("/watermark/verify", methods=["POST"])
def verify_watermark():
    """Verify that the embedded watermark matches an expected value."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        expected_text = data.get("expected_text")

        if not filename:
            return jsonify({"success": False, "error": "Filename is required."}), 400
        if not expected_text:
            return jsonify({"success": False, "error": "Expected text is required."}), 400

        result = extract_lsb_watermark(filename)
        verified = result["watermark"] == expected_text

        return jsonify({
            "success": True,
            "verified": verified,
            "extracted": result["watermark"],
        }), 200

    except FileNotFoundError:
        return jsonify({"success": False, "error": "Protected image not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error verifying watermark")
        return jsonify({"success": False, "error": "Internal server error."}), 500
