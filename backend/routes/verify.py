"""Verification routes (placeholder)."""
from flask import Blueprint, jsonify

verify_bp = Blueprint("verify", __name__)


@verify_bp.route("/verify", methods=["GET", "POST"])
def verify_stub():
    """Placeholder endpoint for verification feature.

    Not implemented in this sprint.
    """
    return jsonify({"error": "Verification not implemented in this sprint."}), 501
