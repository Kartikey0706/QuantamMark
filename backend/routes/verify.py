"""Verification routes for watermark verification."""
from flask import Blueprint, current_app, jsonify, request

from ..services.watermark_service import extract_lsb_watermark

verify_bp = Blueprint("verify", __name__)


@verify_bp.route("/verify", methods=["GET", "POST"])
def verify_stub():
    """Verify a protected image against an expected watermark string."""
    try:
        if request.method == "GET":
            data = request.args.to_dict(flat=True)
        else:
            data = request.get_json(silent=True) or {}

        filename = data.get("filename")
        expected_text = data.get("expected_text") or data.get("watermark_text")

        if not filename:
            return jsonify({"success": False, "error": "Filename is required."}), 400
        if not expected_text:
            return jsonify({"success": False, "error": "Expected text is required."}), 400

        result = extract_lsb_watermark(filename)
        verified = result.get("watermark") == expected_text

        return jsonify({
            "success": True,
            "verified": verified,
            "extracted": result.get("watermark"),
            "filename": filename,
        }), 200

    except FileNotFoundError:
        return jsonify({"success": False, "error": "Protected image not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error verifying watermark")
        return jsonify({"success": False, "error": "Internal server error."}), 500
