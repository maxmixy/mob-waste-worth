import io
import os
import base64
import tempfile
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

import json as _json
#Database (Firestore) setup
import firebase_admin
from firebase_admin import credentials, firestore

def init_firestore():
    try:
        # 1) Path to service account JSON file
        key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if key_path and os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            return firestore.client()

        # 2) Raw JSON in env var (avoid storing big strings in env for long-term)
        raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if raw:
            cred_dict = _json.loads(raw)
            cred = credentials.Certificate(cred_dict)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            return firestore.client()

        # 3) Local file fallback (relative to this file)
        local_key = os.path.join(os.path.dirname(__file__), 'baseadminsdk.json')
        if os.path.exists(local_key):
            cred = credentials.Certificate(local_key)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            return firestore.client()

        # 4) Fall back to Application Default Credentials (ADC)
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        return firestore.client()
    except Exception as e:
        # log and re-raise or return None
        print("Firestore init failed:", e)
        return None

db = init_firestore()

#Gemini API setup
from google import genai
from google.genai import types

client = genai.Client(api_key="AIzaSyDRT3lI3JrVKvg41ZbIp1l2Hibilae7EWU")
app = Flask(__name__)
CORS(app)  # allow all origins for development; tighten in production

#Routes

def _load_image_from_base64(data_str: str):
    try:
        if not data_str:
            return None
        if data_str.startswith('data:'):
            _, data_str = data_str.split(',', 1)
        # Replace URL-encoded spaces and fix missing padding
        data_str = data_str.replace(' ', '+')
        missing_padding = len(data_str) % 4
        if missing_padding:
            data_str += '=' * (4 - missing_padding)
        decoded = base64.b64decode(data_str)
        return Image.open(io.BytesIO(decoded)).convert('RGB')
    except Exception:
        return None

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
        text_prompt = f"""You are a recycling expert. Identify the recyclable object in the image. Also identify any relevant traits about the item: 
        Color, Shape/form, Transparency, Surface Condition, Texture, Size, Others. Minimize traits to single words as much as possible. 
        Return in this exact format: "{{"Name": "Material Name", "Traits": ["Trait1", "Trait2", "Trait3"]}}"."
        """
        response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[img, text_prompt]
                )
        material = _json.loads(response.text.strip())
        
        # Normalize traits for consistent equality matching in Firestore
        def _normalize_traits(traits_value):
            if not traits_value:
                return []
            try:
                return sorted({str(t).strip().casefold() for t in traits_value})
            except Exception:
                return []
        
        normalized_traits = _normalize_traits(material.get('Traits'))
        if db is None:
            return jsonify({'error': 'DB is not initialized'}), 500
            
        print("DB is initialized")
        query = db.collection('Materials').where('Name', '==', material.get('Name'))
        if normalized_traits:
            query = query.where('Traits', '==', normalized_traits)
        docs = query.stream()
        materials = [d.to_dict() for d in docs]
        print("Materials found:", materials)
        if not materials:
            doc_data = {
                'Name': material.get('Name'),
                'Traits': normalized_traits
            }
            if not doc_data['Name']:
                return jsonify({'error': 'Model did not return a Name field'}), 502
            db.collection('Materials').add(doc_data)
            print("Inserted new material:", doc_data)
            return jsonify({'Scanned Material': [doc_data], 'inserted': True})

        return jsonify({'Scanned Material': materials, 'inserted': False})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Listen on all interfaces so the mobile device / emulator can reach it.
    app.run(host='0.0.0.0', port=5000, debug=True)