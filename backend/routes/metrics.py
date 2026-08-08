"""Metrics route for Sprint 7."""
import os
from flask import Blueprint, jsonify, request, current_app

from ..services.metrics_service import calculate_metrics

metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.route("/metrics", methods=["POST"])
def metrics():
    """Calculate image quality and watermark capacity metrics."""
    try:
        data = request.get_json(silent=True) or {}
        original_filename = data.get("original_filename")
        processed_filename = data.get("processed_filename")

        if not original_filename:
            return jsonify({"success": False, "error": "Original filename is required."}), 400
        if not processed_filename:
            return jsonify({"success": False, "error": "Processed filename is required."}), 400

        base_dir = os.path.dirname(os.path.dirname(__file__))
        original_path = os.path.join(base_dir, "uploads", os.path.basename(original_filename))
        processed_path = os.path.join(base_dir, "processed", os.path.basename(processed_filename))

        metrics_payload = calculate_metrics(original_path, processed_path)
        return jsonify({"success": True, **metrics_payload}), 200
    except FileNotFoundError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error calculating metrics")
        return jsonify({"success": False, "error": "Internal server error."}), 500
