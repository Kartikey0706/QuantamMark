import os
import sys
import tempfile
import unittest

from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app import create_app
from backend.services.watermark_service import embed_lsb_watermark, extract_lsb_watermark


class WatermarkFlowTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()

    def _create_test_image(self, path: str, size=(32, 32)):
        image = Image.new("RGB", size, color=(255, 0, 0))
        image.save(path)

    def test_extract_and_verify_watermark_round_trip(self):
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        processed_dir = os.path.join(os.path.dirname(__file__), "..", "processed")
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(processed_dir, exist_ok=True)

        image_name = "roundtrip.png"
        image_path = os.path.join(upload_dir, image_name)
        self._create_test_image(image_path)

        result = embed_lsb_watermark(image_name, "QuantumMark")
        self.assertEqual(result["algorithm"], "LSB")

        extraction_response = self.client.post(
            "/watermark/extract",
            json={"filename": result["processed_filename"]},
        )
        self.assertEqual(extraction_response.status_code, 200)
        payload = extraction_response.get_json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["watermark"], "QuantumMark")

        verify_response = self.client.post(
            "/watermark/verify",
            json={"filename": result["processed_filename"], "expected_text": "QuantumMark"},
        )
        self.assertEqual(verify_response.status_code, 200)
        verify_payload = verify_response.get_json()
        self.assertTrue(verify_payload["verified"])
        self.assertEqual(verify_payload["extracted"], "QuantumMark")

        mismatch_response = self.client.post(
            "/watermark/verify",
            json={"filename": result["processed_filename"], "expected_text": "DifferentText"},
        )
        self.assertEqual(mismatch_response.status_code, 200)
        mismatch_payload = mismatch_response.get_json()
        self.assertFalse(mismatch_payload["verified"])
        self.assertEqual(mismatch_payload["extracted"], "QuantumMark")

    def test_extract_reports_missing_watermark(self):
        image_name = "missing_watermark.png"
        processed_path = os.path.join(os.path.dirname(__file__), "..", "processed", image_name)
        os.makedirs(os.path.dirname(processed_path), exist_ok=True)
        self._create_test_image(processed_path)

        with self.assertRaises(ValueError):
            extract_lsb_watermark(image_name)


if __name__ == "__main__":
    unittest.main()
