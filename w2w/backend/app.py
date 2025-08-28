import io
import os
import base64
import tempfile
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

from google import genai
from google.genai import types

client = genai.Client(api_key="AIzaSyDRT3lI3JrVKvg41ZbIp1l2Hibilae7EWU")
app = Flask(__name__)
CORS(app)  # allow all origins for development; tighten in production


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/upload', methods=['POST'])
def upload():
    """Accepts an image upload via multipart/form-data (field 'image')
    or JSON with { "image": "data:image/png;base64,..." }.

    Returns JSON with a `classification` object so the Expo frontend can display it.
    """
    img = None
        # 1) multipart/form-data with file field 'image'
    if 'image' in request.files:
        f = request.files['image']               # werkzeug FileStorage
        img = Image.open(f.stream).convert('RGB')
        print("image in request files")

    # 2) JSON { "image": "data:...base64,...." }
    elif request.is_json:
        payload = request.get_json(silent=True) or {}
        data = payload.get('image')
        print("request is json")
        if data:
            if data.startswith('data:'):
                _, b64 = data.split(',', 1)
            else:
                b64 = data
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')

    # 3) form field 'image' containing base64 string
    elif 'image' in request.form:
        data = request.form['image']
        if data.startswith('data:'):
            _, b64 = data.split(',', 1)
        else:
            b64 = data
        img = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')

    # 4) raw image bytes (Content-Type: image/*)
    else:
        ctype = (request.content_type or '')
        if ctype.startswith('image/') and request.data:
            img = Image.open(io.BytesIO(request.data)).convert('RGB')

    if img is None:
        return jsonify({'error': 'No image provided or unsupported Content-Type'}), 415

    # ... process `img` and return JSON ...
    try:
        
        
        if img is None:
            return jsonify({'error': 'No image provided'}), 400

        text_prompt = "You are a recycling expert. Identify the recyclable object in the image. Also identify any relevant traits about the item: Color, Shape/form, Transparency, Surface Condition, Texture, Size, Others. Minimize traits to single words as much as possible. Return only a JSON object with fields 'Name' and an array of 'Traits'."
        response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[img, text_prompt]
                )
        
        material = response.text.strip()
        return jsonify({'classification': material})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Listen on all interfaces so the mobile device / emulator can reach it.
    app.run(host='0.0.0.0', port=5000, debug=True)