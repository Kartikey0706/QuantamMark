"""Flask application factory for QuantumMark backend."""
import os
from flask import Flask, jsonify
from flask_cors import CORS


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Enable CORS for all domains on all routes
    CORS(app)

    # Ensure required directories exist
    from .utils.helpers import ensure_dirs

    base = os.path.dirname(os.path.abspath(__file__))
    uploads = os.path.join(base, "uploads")
    processed = os.path.join(base, "processed")
    temp = os.path.join(base, "temp")
    ensure_dirs([uploads, processed, temp])

    # Register blueprints
    from .routes.upload import upload_bp
    from .routes.watermark import watermark_bp
    from .routes.verify import verify_bp
    from .routes.attacks import attacks_bp

    app.register_blueprint(upload_bp)
    app.register_blueprint(watermark_bp)
    app.register_blueprint(verify_bp)
    app.register_blueprint(attacks_bp)

    @app.route("/", methods=["GET"])
    def index():
        return jsonify({"project": "QuantumMark", "status": "running"}), 200

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy"}), 200

    return app


if __name__ == "__main__":
    # Run with: python -m backend.app
    application = create_app()
    application.run(host="0.0.0.0", port=5000, debug=True)
