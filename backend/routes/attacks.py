"""Attack lab routes (placeholder)."""
from flask import Blueprint, jsonify

attacks_bp = Blueprint("attacks", __name__)


@attacks_bp.route("/attacks", methods=["GET", "POST"])
def attacks_stub():
    """Placeholder endpoint for attack lab feature.

    Not implemented in this sprint.
    """
    return jsonify({"error": "Attacks lab not implemented in this sprint."}), 501
