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
        materials = [{**d.to_dict(), 'id': d.id} for d in docs]
        print("Materials found:", materials)
        if not materials:
            doc_data = {
                'Name': material.get('Name'),
                'Traits': normalized_traits
            }
            if not doc_data['Name']:
                return jsonify({'error': 'Model did not return a Name field'}), 502
            doc_ref = db.collection('Materials').document()
            doc_ref.set(doc_data)
            inserted_doc = {**doc_data, 'id': doc_ref.id}
            print("Inserted new material:", inserted_doc)
            return jsonify({'Scanned Material': [inserted_doc], 'inserted': True})

        return jsonify({'Scanned Material': materials, 'inserted': False})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/log', methods=['POST'])
def log_scan():
    """Log a user's scan by adding material ID to their User_collection document"""
    try:
        data = request.get_json()
        print("Data:", data)
        if not data or 'userId' not in data or 'materialId' not in data:
            return jsonify({'error': 'Missing userId or materialId'}), 400
        
        userId = data['userId']
        materialId = data['materialId']
        
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Check if user document exists
        user_doc = db.collection('User_collection').document(userId).get()
        
        if user_doc.exists:
            # User exists, append material ID to Materials array
            user_data = user_doc.to_dict()
            materials = user_data.get('Materials', [])
            
            # Only add if not already in the array
            if materialId not in materials:
                materials.append(materialId)
                db.collection('User_collection').document(userId).update({
                    'Materials': materials
                })
                print(f"Added material {materialId} to user {userId}")
                
            print(f"Material {materialId} already exists for user {userId}")
        else:
            # Create new user document
            db.collection('User_collection').document(userId).set({
                'Materials': [materialId]
            })
            print(f"Created new user document for {userId} with material {materialId}")
        
        return jsonify({'success': True, 'message': 'Scan logged successfully'})
        
    except Exception as e:
        print(f"Error logging scan: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/material/<material_id>', methods=['GET'])
def get_material_details(material_id):
    """Get detailed information about a specific material"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Try to find material by ID first
        material_doc = db.collection('Materials').document(material_id).get()
        
        if not material_doc.exists:
            # If not found by ID, try to find by name
            docs = db.collection('Materials').where('Name', '==', material_id).stream()
            materials = [d.to_dict() for d in docs]
            if materials:
                material_data = {**materials[0], 'id': material_id}
            else:
                return jsonify({'error': 'Material not found'}), 404
        else:
            material_data = {**material_doc.to_dict(), 'id': material_doc.id}
        
        return jsonify(material_data)
        
    except Exception as e:
        print(f"Error fetching material details: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/projects/<material_id>', methods=['GET'])
def get_recycling_projects(material_id):
    """Get recycling projects for a specific material"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # For now, return sample projects. In a real app, you'd query a Projects collection
        # based on material_id or material traits
        sample_projects = [
            {
                "id": "project_1",
                "title": "DIY Plant Pot",
                "description": "Transform your waste into a beautiful plant pot for your home garden.",
                "imageUrl": None,
                "difficulty": "easy",
                "materialsNeeded": [material_id, "scissors", "soil", "seeds"],
                "instructions": [
                    "Clean the material thoroughly",
                    "Cut or shape as needed for pot structure",
                    "Add drainage holes if necessary",
                    "Fill with soil and plant your seeds"
                ]
            },
            {
                "id": "project_2", 
                "title": "Storage Container",
                "description": "Create organized storage solutions from recycled materials.",
                "imageUrl": None,
                "difficulty": "medium",
                "materialsNeeded": [material_id, "paint", "brushes", "decorations"],
                "instructions": [
                    "Clean and prepare the material",
                    "Paint or decorate as desired",
                    "Add labels or dividers if needed",
                    "Use for organizing small items"
                ]
            },
            {
                "id": "project_3",
                "title": "Art & Craft Project",
                "description": "Express your creativity with unique recycled art projects.",
                "imageUrl": None,
                "difficulty": "hard",
                "materialsNeeded": [material_id, "paint", "glue", "other craft supplies"],
                "instructions": [
                    "Plan your design",
                    "Prepare and clean materials",
                    "Assemble and decorate",
                    "Display your creation"
                ]
            }
        ]
        
        return jsonify(sample_projects)
        
    except Exception as e:
        print(f"Error fetching recycling projects: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/disposal/<material_id>', methods=['GET'])
def get_disposal_methods(material_id):
    """Get disposal methods for a specific material"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get material details to determine disposal methods
        material_doc = db.collection('Materials').document(material_id).get()
        
        if not material_doc.exists:
            # Try to find by name
            docs = db.collection('Materials').where('Name', '==', material_id).stream()
            materials = [d.to_dict() for d in docs]
            if not materials:
                return jsonify('Disposal method not available for this material.')
            material_data = materials[0]
        else:
            material_data = material_doc.to_dict()
        
        # Generate disposal methods based on material traits
        disposal_methods = generate_disposal_methods(material_data)
        
        return jsonify(disposal_methods)
        
    except Exception as e:
        print(f"Error fetching disposal methods: {e}")
        return jsonify({'error': str(e)}), 500


def generate_disposal_methods(material_data):
    """Generate disposal methods based on material traits"""
    traits = material_data.get('Traits', [])
    name = material_data.get('Name', '').lower()
    
    disposal_methods = []
    
    # Basic disposal methods based on material type
    if 'plastic' in name or any('plastic' in trait.lower() for trait in traits):
        disposal_methods.append("Rinse thoroughly and place in blue recycling bin.")
        disposal_methods.append("Remove caps and labels if possible.")
        disposal_methods.append("Check local recycling guidelines for specific requirements.")
    
    elif 'glass' in name or any('glass' in trait.lower() for trait in traits):
        disposal_methods.append("Rinse thoroughly and place in glass recycling bin.")
        disposal_methods.append("Handle carefully to avoid breakage.")
        disposal_methods.append("Some areas accept glass in general recycling.")
    
    elif 'metal' in name or any('metal' in trait.lower() for trait in traits):
        disposal_methods.append("Rinse and place in metal recycling bin.")
        disposal_methods.append("Crush cans to save space if allowed.")
        disposal_methods.append("Check for local scrap metal collection.")
    
    elif 'paper' in name or any('paper' in trait.lower() for trait in traits):
        disposal_methods.append("Place in paper recycling bin.")
        disposal_methods.append("Remove any non-paper attachments.")
        disposal_methods.append("Keep dry and clean.")
    
    else:
        disposal_methods.append("Check local waste management guidelines.")
        disposal_methods.append("Consider if the item can be reused or repurposed.")
        disposal_methods.append("Contact local recycling center for specific instructions.")
    
    return " ".join(disposal_methods)


def has_trait_overlap(traits1, traits2):
    """Check if two materials have overlapping traits"""
    if not traits1 or not traits2:
        return False
    
    # Normalize traits for comparison
    normalized_traits1 = {trait.lower().strip() for trait in traits1}
    normalized_traits2 = {trait.lower().strip() for trait in traits2}
    
    # Check for overlap
    overlap = normalized_traits1.intersection(normalized_traits2)
    return len(overlap) > 0


@app.route('/related/<material_id>', methods=['GET'])
def get_related_materials(material_id):
    """Get related materials based on traits"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get current material traits
        material_doc = db.collection('Materials').document(material_id).get()
        
        if not material_doc.exists:
            # Try to find by name
            docs = db.collection('Materials').where('Name', '==', material_id).stream()
            materials = [d.to_dict() for d in docs]
            if not materials:
                return jsonify([])
            current_material = materials[0]
        else:
            current_material = material_doc.to_dict()
        
        # Find materials with similar traits
        related_materials = []
        all_materials = db.collection('Materials').stream()
        
        for doc in all_materials:
            if doc.id != material_id:
                material_data = doc.to_dict()
                # Check for trait overlap
                if has_trait_overlap(current_material.get('Traits', []), material_data.get('Traits', [])):
                    related_materials.append({
                        **material_data,
                        'id': doc.id
                    })
        
        # Return top 3 related materials
        return jsonify(related_materials[:3])
        
    except Exception as e:
        print(f"Error fetching related materials: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/materials', methods=['GET'])
def get_user_materials(user_id):
    """Get all material IDs for a specific user"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify([])
        
        user_data = user_doc.to_dict()
        materials = user_data.get('Materials', [])
        
        return jsonify(materials)
        
    except Exception as e:
        print(f"Error fetching user materials: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>', methods=['GET'])
def get_user_data(user_id):
    """Get user data including current project"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        
        return jsonify(user_data)
        
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/recycling/<project_id>', methods=['GET'])
def get_recycling_project(project_id):
    """Get recycling project details from Recycling collection"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get project document from Recycling collection
        project_doc = db.collection('Recycling').document(project_id).get()
        
        if not project_doc.exists:
            return jsonify({'error': 'Project not found'}), 404
        
        project_data = project_doc.to_dict()
        project_data['id'] = project_doc.id
        
        return jsonify(project_data)
        
    except Exception as e:
        print(f"Error fetching recycling project: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Listen on all interfaces so the mobile device / emulator can reach it.
    app.run(host='0.0.0.0', port=5000, debug=True)