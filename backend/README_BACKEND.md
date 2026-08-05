# QuantumMark — Backend (Sprint 3)

This folder contains the Flask backend foundation for the QuantumMark project.

Quickstart

1. Create a Python environment (recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

2. Run the backend (from project root):

```powershell
python -m backend.app
```

APIs implemented (foundation only)

- `GET /` — returns project status JSON
- `GET /health` — returns health JSON
- `POST /upload` — accepts multipart image, validates and saves to `backend/uploads/`

Notes

- CORS is enabled.
- Routes use Flask Blueprints under `backend/routes/`.
- Services are separated under `backend/services/`.
- Watermarking, verification, attacks, QRNG, and metrics are placeholders for later sprints.
