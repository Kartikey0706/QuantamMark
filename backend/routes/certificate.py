"""Certificate routes for Sprint 10."""

from flask import Blueprint, current_app, jsonify, request

from ..services.certificate_service import generate_certificate, verify_certificate

certificate_bp = Blueprint("certificate", __name__)


@certificate_bp.route("/certificate/generate", methods=["POST"])
def generate_certificate_route():
    """Generate a digital ownership certificate for a protected image."""
    try:
        data = request.get_json(silent=True) or {}
        protected_filename = data.get("protected_filename")
        watermark = data.get("watermark")

        if not protected_filename:
            return jsonify({"success": False, "error": "Protected filename is required."}), 400
        if not watermark:
            return jsonify({"success": False, "error": "Watermark is required."}), 400

        result = generate_certificate(protected_filename, watermark)
        return jsonify(result), 200
    except FileNotFoundError:
        return jsonify({"success": False, "error": "Protected image not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error generating certificate")
        return jsonify({"success": False, "error": "Internal server error."}), 500


@certificate_bp.route("/certificate/verify/<verification_id>", methods=["GET"])
def verify_certificate_route(verification_id):
    """Return certificate metadata for a verification ID."""
    try:
        result = verify_certificate(verification_id)
        status_code = 200 if result.get("success") else 404
        return jsonify(result), status_code
    except Exception:
        current_app.logger.exception("Error verifying certificate")
        return jsonify({"success": False, "verified": False, "error": "Internal server error."}), 500
