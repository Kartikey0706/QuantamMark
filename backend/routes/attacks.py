"""Attack lab routes for Sprint 8."""
from flask import Blueprint, current_app, jsonify, request

from ..services.attack_service import apply_attack, test_attack

attacks_bp = Blueprint("attacks", __name__)


@attacks_bp.route("/attacks/apply", methods=["POST"])
def apply_attack_route():
    """Create an attacked copy of a protected image."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        attack = data.get("attack")

        if not filename:
            return jsonify({"success": False, "error": "Filename is required."}), 400
        if not attack:
            return jsonify({"success": False, "error": "Attack is required."}), 400

        result = apply_attack(filename, attack)
        return jsonify(result), 200
    except FileNotFoundError:
        return jsonify({"success": False, "error": "Protected image not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error applying attack")
        return jsonify({"success": False, "error": "Internal server error."}), 500


@attacks_bp.route("/attacks/test", methods=["POST"])
def test_attack_route():
    """Apply an attack and test whether the watermark survives."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("filename")
        watermark = data.get("watermark")
        attack = data.get("attack")

        if not filename:
            return jsonify({"success": False, "error": "Filename is required."}), 400
        if not watermark:
            return jsonify({"success": False, "error": "Watermark is required."}), 400
        if not attack:
            return jsonify({"success": False, "error": "Attack is required."}), 400

        result = test_attack(filename, watermark, attack)
        return jsonify(result), 200
    except FileNotFoundError:
        return jsonify({"success": False, "error": "Protected image not found."}), 404
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Error testing attack")
        return jsonify({"success": False, "error": "Internal server error."}), 500
