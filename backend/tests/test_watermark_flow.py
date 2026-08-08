import hashlib
import io
import math
import os
import sys
import unittest

from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app import create_app
from backend.services.certificate_service import generate_certificate, get_certificate, verify_certificate
from backend.services.metrics_service import calculate_metrics
from backend.services.qrng_service import generate_quantum_random_bytes, generate_security_key


class WatermarkFlowTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()

    def _upload_test_image(self, filename: str = "small.png"):
        image_bytes = io.BytesIO()
        Image.new("RGB", (32, 32), color=(255, 0, 0)).save(image_bytes, format="PNG")
        image_bytes.seek(0)

        response = self.client.post(
            "/upload",
            data={"image": (image_bytes, filename)},
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertTrue(payload["success"])
        return payload["filename"]

    def test_sprint6_complete_workflow(self):
        uploaded_filename = self._upload_test_image("sprint6.png")

        embed_response = self.client.post(
            "/watermark/embed",
            json={"filename": uploaded_filename, "watermark_text": "QuantumMark Test 123"},
        )
        self.assertEqual(embed_response.status_code, 200, embed_response.get_data(as_text=True))
        embed_payload = embed_response.get_json()
        self.assertTrue(embed_payload["success"])
        self.assertEqual(embed_payload["algorithm"], "LSB")

        processed_filename = embed_payload["processed_filename"]
        processed_path = os.path.join(os.path.dirname(__file__), "..", "processed", processed_filename)
        self.assertTrue(os.path.isfile(processed_path), f"Expected processed image at {processed_path}")

        extract_response = self.client.post(
            "/watermark/extract",
            json={"filename": processed_filename},
        )
        self.assertEqual(extract_response.status_code, 200, extract_response.get_data(as_text=True))
        extract_payload = extract_response.get_json()
        self.assertTrue(extract_payload["success"])
        self.assertEqual(extract_payload["watermark"], "QuantumMark Test 123")
        self.assertNotIn("<<<END>>>", extract_payload["watermark"])

        verify_response = self.client.post(
            "/watermark/verify",
            json={"filename": processed_filename, "expected_text": "QuantumMark Test 123"},
        )
        self.assertEqual(verify_response.status_code, 200, verify_response.get_data(as_text=True))
        verify_payload = verify_response.get_json()
        self.assertTrue(verify_payload["verified"])
        self.assertEqual(verify_payload["extracted"], "QuantumMark Test 123")

        mismatch_response = self.client.post(
            "/watermark/verify",
            json={"filename": processed_filename, "expected_text": "Wrong watermark"},
        )
        self.assertEqual(mismatch_response.status_code, 200, mismatch_response.get_data(as_text=True))
        mismatch_payload = mismatch_response.get_json()
        self.assertFalse(mismatch_payload["verified"])
        self.assertEqual(mismatch_payload["extracted"], "QuantumMark Test 123")

    def test_utf8_and_delimiter_handling(self):
        uploaded_filename = self._upload_test_image("utf8.png")
        watermark_text = "QuantumMark Café 你好 🌍"

        embed_response = self.client.post(
            "/watermark/embed",
            json={"filename": uploaded_filename, "watermark_text": watermark_text},
        )
        self.assertEqual(embed_response.status_code, 200, embed_response.get_data(as_text=True))

        processed_filename = embed_response.get_json()["processed_filename"]
        extract_response = self.client.post(
            "/watermark/extract",
            json={"filename": processed_filename},
        )
        self.assertEqual(extract_response.status_code, 200, extract_response.get_data(as_text=True))
        self.assertEqual(extract_response.get_json()["watermark"], watermark_text)
        self.assertNotIn("<<<END>>>", extract_response.get_json()["watermark"])

    def test_missing_and_invalid_image_handling(self):
        missing_response = self.client.post(
            "/watermark/extract",
            json={"filename": "does-not-exist.png"},
        )
        self.assertEqual(missing_response.status_code, 404)
        self.assertIn("not found", missing_response.get_json()["error"].lower())

        invalid_path = os.path.join(os.path.dirname(__file__), "..", "processed", "invalid-image.png")
        os.makedirs(os.path.dirname(invalid_path), exist_ok=True)
        with open(invalid_path, "wb") as handle:
            handle.write(b"this is not an image")

        invalid_response = self.client.post(
            "/watermark/extract",
            json={"filename": "invalid-image.png"},
        )
        self.assertEqual(invalid_response.status_code, 400)
        self.assertIn("invalid", invalid_response.get_json()["error"].lower())

        invalid_upload_response = self.client.post(
            "/upload",
            data={"image": (io.BytesIO(b"not-an-image"), "invalid.png")},
            content_type="multipart/form-data",
        )
        self.assertEqual(invalid_upload_response.status_code, 400)
        self.assertIn("valid image", invalid_upload_response.get_json()["error"].lower())

    def _embed_test_image(self, filename: str, watermark_text: str = "QuantumMark Test 123"):
        uploaded_filename = self._upload_test_image(filename)
        embed_response = self.client.post(
            "/watermark/embed",
            json={"filename": uploaded_filename, "watermark_text": watermark_text},
        )
        self.assertEqual(embed_response.status_code, 200, embed_response.get_data(as_text=True))
        embed_payload = embed_response.get_json()
        self.assertTrue(embed_payload["success"])
        return embed_payload["processed_filename"]

    def test_attack_lab_apply_and_test_endpoints(self):
        protected_filename = self._embed_test_image("attack_lab.png", "Attack Lab Watermark")
        original_path = os.path.join(os.path.dirname(__file__), "..", "processed", protected_filename)
        original_hash = hashlib.sha256(open(original_path, "rb").read()).hexdigest()

        for attack_name in ["jpeg_compression", "gaussian_noise", "rotation", "crop", "blur"]:
            apply_response = self.client.post(
                "/attacks/apply",
                json={"filename": protected_filename, "attack": attack_name},
            )
            self.assertEqual(apply_response.status_code, 200, apply_response.get_data(as_text=True))
            apply_payload = apply_response.get_json()
            self.assertTrue(apply_payload["success"])
            self.assertEqual(apply_payload["attack"], attack_name)
            self.assertIn("filename", apply_payload)
            self.assertIn("path", apply_payload)
            self.assertTrue(os.path.isfile(os.path.join(os.path.dirname(__file__), "..", "processed", "attacks", apply_payload["filename"])))

            test_response = self.client.post(
                "/attacks/test",
                json={
                    "filename": protected_filename,
                    "watermark": "Attack Lab Watermark",
                    "attack": attack_name,
                },
            )
            self.assertEqual(test_response.status_code, 200, test_response.get_data(as_text=True))
            test_payload = test_response.get_json()
            self.assertTrue(test_payload["success"])
            self.assertEqual(test_payload["attack"], attack_name)
            self.assertIn("watermark_recovered", test_payload)
            self.assertIn("verified", test_payload)
            self.assertIn("metrics", test_payload)
            self.assertIn("status", apply_payload)

        current_hash = hashlib.sha256(open(original_path, "rb").read()).hexdigest()
        self.assertEqual(current_hash, original_hash)

    def test_attack_lab_rejects_invalid_attack_and_missing_file(self):
        invalid_response = self.client.post(
            "/attacks/apply",
            json={"filename": "does-not-exist.png", "attack": "jpeg_compression"},
        )
        self.assertEqual(invalid_response.status_code, 404)
        self.assertIn("not found", invalid_response.get_json()["error"].lower())

        reject_response = self.client.post(
            "/attacks/apply",
            json={"filename": "protected_dummy.png", "attack": "not_real"},
        )
        self.assertEqual(reject_response.status_code, 400)
        self.assertIn("attack", reject_response.get_json()["error"].lower())

    def test_qrng_generation_and_fallback(self):
        bytes_payload = generate_quantum_random_bytes(16)
        self.assertEqual(len(bytes_payload["data"]), 16)
        self.assertIn(bytes_payload["source"], {"quantum_simulator", "secure_random_fallback"})

        key_payload = generate_security_key(32)
        self.assertEqual(len(key_payload["key"]), 64)
        self.assertIn(key_payload["source"], {"quantum_simulator", "secure_random_fallback"})

        qrng_response = self.client.post("/qrng/key", json={"length": 32})
        self.assertEqual(qrng_response.status_code, 200)
        qrng_payload = qrng_response.get_json()
        self.assertTrue(qrng_payload["success"])
        self.assertEqual(qrng_payload["key_length"], 32)
        self.assertIn(qrng_payload["source"], {"quantum_simulator", "secure_random_fallback"})
        self.assertEqual(len(qrng_payload["key"]), 64)

        invalid_length_response = self.client.post("/qrng/key", json={"length": 5})
        self.assertEqual(invalid_length_response.status_code, 400)
        self.assertIn("length", invalid_length_response.get_json()["error"].lower())

    def test_certificate_generation_and_verification(self):
        protected_filename = self._embed_test_image("certificate.png", "QuantumMark Certificate Test")
        certificate = generate_certificate(protected_filename, "QuantumMark Certificate Test")
        self.assertTrue(certificate["success"])
        self.assertTrue(certificate["certificate_id"].startswith("QM-"))
        self.assertTrue(certificate["verification_id"].startswith("QM-"))
        self.assertIn("certificate", certificate)
        self.assertNotIn("secret", str(certificate).lower())
        self.assertNotIn("key", str(certificate).lower())
        self.assertEqual(certificate["certificate"]["protected_filename"], protected_filename)
        self.assertEqual(certificate["certificate"]["watermark"], "QuantumMark Certificate Test")

        stored = get_certificate(certificate["verification_id"])
        self.assertIsNotNone(stored)
        self.assertEqual(stored["certificate_id"], certificate["certificate_id"])

        verify_payload = verify_certificate(certificate["verification_id"])
        self.assertTrue(verify_payload["success"])
        self.assertTrue(verify_payload["verified"])
        self.assertEqual(verify_payload["certificate"]["verification_id"], certificate["verification_id"])

        api_response = self.client.post(
            "/certificate/generate",
            json={"protected_filename": protected_filename, "watermark": "QuantumMark Certificate Test"},
        )
        self.assertEqual(api_response.status_code, 200)
        api_payload = api_response.get_json()
        self.assertTrue(api_payload["success"])
        self.assertIn("certificate", api_payload)
        self.assertIn("qr_path", api_payload)

        bad_verify = self.client.get("/certificate/verify/invalid-id")
        self.assertEqual(bad_verify.status_code, 404)

    def test_verify_route_returns_real_verification_result(self):
        protected_filename = self._embed_test_image("verify_route.png", "Verify Route Watermark")

        verify_response = self.client.post(
            "/verify",
            json={"filename": protected_filename, "expected_text": "Verify Route Watermark"},
        )
        self.assertEqual(verify_response.status_code, 200, verify_response.get_data(as_text=True))
        verify_payload = verify_response.get_json()
        self.assertTrue(verify_payload["success"])
        self.assertTrue(verify_payload["verified"])
        self.assertEqual(verify_payload["extracted"], "Verify Route Watermark")

    def test_metrics_service_calculations(self):
        original_path = os.path.join(os.path.dirname(__file__), "..", "uploads", "metrics_original.png")
        protected_path = os.path.join(os.path.dirname(__file__), "..", "processed", "metrics_protected.png")
        os.makedirs(os.path.dirname(original_path), exist_ok=True)
        os.makedirs(os.path.dirname(protected_path), exist_ok=True)

        Image.new("RGB", (64, 64), color=(255, 0, 0)).save(original_path)
        Image.new("RGB", (64, 64), color=(255, 0, 0)).save(protected_path)

        metrics = calculate_metrics(original_path, protected_path)
        self.assertGreaterEqual(metrics["psnr"], 0)
        self.assertGreaterEqual(metrics["ssim"], 0)
        self.assertLessEqual(metrics["ssim"], 1)
        self.assertGreaterEqual(metrics["entropy"], 0)
        self.assertGreaterEqual(metrics["embedding_time_ms"], 0)
        self.assertGreater(metrics["capacity_bits"], 0)
        self.assertGreaterEqual(metrics["capacity_used_percent"], 0)
        self.assertLessEqual(metrics["capacity_used_percent"], 100)

    def test_metrics_endpoint_and_identical_image_safety(self):
        uploaded_filename = self._upload_test_image("metrics.png")
        embed_response = self.client.post(
            "/watermark/embed",
            json={"filename": uploaded_filename, "watermark_text": "Sprint7"},
        )
        self.assertEqual(embed_response.status_code, 200, embed_response.get_data(as_text=True))
        embed_payload = embed_response.get_json()
        self.assertIn("psnr", embed_payload)
        self.assertIn("ssim", embed_payload)
        self.assertIn("entropy", embed_payload)
        self.assertIn("embedding_time_ms", embed_payload)

        metrics_response = self.client.post(
            "/metrics",
            json={"original_filename": uploaded_filename, "processed_filename": embed_payload["processed_filename"]},
        )
        self.assertEqual(metrics_response.status_code, 200)
        metrics_payload = metrics_response.get_json()
        self.assertTrue(metrics_payload["success"])
        self.assertIn("psnr", metrics_payload)
        self.assertIn("ssim", metrics_payload)
        self.assertIn("entropy", metrics_payload)
        self.assertGreaterEqual(metrics_payload["embedding_time_ms"], 0)
        self.assertGreater(metrics_payload["capacity_bits"], 0)
        self.assertGreaterEqual(metrics_payload["capacity_used_percent"], 0)

        same_image_path = os.path.join(os.path.dirname(__file__), "..", "uploads", "metrics_identical.png")
        Image.new("RGB", (16, 16), color=(10, 20, 30)).save(same_image_path)
        identical_metrics = calculate_metrics(same_image_path, same_image_path)
        self.assertTrue(math.isinf(identical_metrics["psnr"]))


if __name__ == "__main__":
    unittest.main()
