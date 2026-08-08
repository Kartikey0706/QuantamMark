import io
import os
import sys

from PIL import Image
from backend.app import create_app

app = create_app()
app.config.update(TESTING=True)
client = app.test_client()

img_bytes = io.BytesIO()
Image.new('RGB', (64, 64), color=(12, 34, 56)).save(img_bytes, format='PNG')
img_bytes.seek(0)
resp = client.post('/upload', data={'image': (img_bytes, 'test.png')}, content_type='multipart/form-data')
print('upload', resp.status_code, resp.get_json())
filename = resp.get_json()['filename']
embed_resp = client.post('/watermark/embed', json={'filename': filename, 'watermark_text': 'QuantumMark Test 123'})
print('embed', embed_resp.status_code, embed_resp.get_json())
processed = embed_resp.get_json()['processed_filename']
print('processed exists', os.path.exists(os.path.join('backend','processed', processed)))
extract_resp = client.post('/watermark/extract', json={'filename': processed})
print('extract', extract_resp.status_code, extract_resp.get_json())
verify_resp = client.post('/watermark/verify', json={'filename': processed, 'expected_text': 'QuantumMark Test 123'})
print('verify correct', verify_resp.status_code, verify_resp.get_json())
verify_bad = client.post('/watermark/verify', json={'filename': processed, 'expected_text': 'wrong'})
print('verify bad', verify_bad.status_code, verify_bad.get_json())
missing = client.post('/watermark/extract', json={'filename': 'does-not-exist.png'})
print('missing', missing.status_code, missing.get_json())
invalid = client.post('/watermark/extract', json={'filename': 'invalid-image.png'})
print('invalid', invalid.status_code, invalid.get_json())
