import io
import os
import base64
import tempfile
import random
import uuid
import hashlib
from datetime import datetime
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

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

# Image upload configuration
UPLOAD_FOLDER = 'uploads/profile_images'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
PROFILE_IMAGE_SIZE = (400, 400)  # Standard profile image size

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(user_id, original_filename):
    """Generate a unique filename for the user's profile image"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = original_filename.rsplit('.', 1)[1].lower()
    return f"{user_id}_{timestamp}.{extension}"

def process_profile_image(image_path):
    """Process and resize profile image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize and crop to square
            img.thumbnail(PROFILE_IMAGE_SIZE, Image.Resampling.LANCZOS)
            
            # Create a square image by cropping
            width, height = img.size
            if width != height:
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                right = left + size
                bottom = top + size
                img = img.crop((left, top, right, bottom))
            
            # Save processed image
            img.save(image_path, 'JPEG', quality=85, optimize=True)
            return True
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

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
        Return in this exact format: "{{"Name": "Object Name", "Traits": ["Trait1", "Trait2", "Trait3"]}}"."
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
        
        # Query the Recycling collection for projects related to this material
        try:
            # Get all projects from Recycling collection
            projects = []
            recycling_projects = db.collection('Recycling').stream()
            
            for doc in recycling_projects:
                project_data = doc.to_dict()
                project_data['id'] = doc.id
                
                # Convert to the expected format for compatibility
                converted_project = {
                    "id": doc.id,
                    "title": project_data.get('project_name', 'Untitled Project'),
                    "description": f"Transform {project_data.get('material_name', 'materials')} into something useful",
                    "imageUrl": project_data.get('project_image'),
                    "difficulty": "medium",  # Default difficulty
                    "materialsNeeded": [material_id] + project_data.get('required_traits', []),
                    "instructions": project_data.get('steps', [])
                }
                projects.append(converted_project)
            
            return jsonify(projects)
        except Exception as e:
            print(f"Error fetching projects from Recycling collection: {e}")
            return jsonify([])
        
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
        
        print(f"Retrieved project from database: {project_data}")
        print(f"Retrieved project steps: {project_data.get('steps', [])}")
        if project_data.get('steps'):
            print(f"Retrieved project first step length: {len(str(project_data['steps'][0]))}")
            print(f"Retrieved project first step content: {str(project_data['steps'][0])}")
        
        return jsonify(project_data)
        
    except Exception as e:
        print(f"Error fetching recycling project: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/recycling/populate', methods=['POST'])
def populate_recycling_table():
    """Populate the Recycling table with sample data, optionally customized for specific material"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get material details from request if provided
        data = request.get_json() or {}
        material_name = data.get('material_name', '')
        material_traits = data.get('material_traits', [])
        scanned_material_id = data.get('scanned_material_id', '')
        
        print(f"Populating recycling table for material: '{material_name}' (ID: '{scanned_material_id}')")
        print(f"Material traits: {material_traits}")
        print(f"Request data: {data}")
        
        # Check existing projects to avoid duplicates
        existing_projects = db.collection('Recycling').stream()
        existing_count = 0
        for doc in existing_projects:
            existing_count += 1
        
        print(f"Found {existing_count} existing projects in Recycling collection")
        
        added_projects = []
        
        # Only create Gemini-generated projects for the specific material
        if material_name and scanned_material_id:
            print(f"Creating Gemini-generated project for material: {material_name}")
            custom_project = create_custom_recycling_project(material_name, material_traits, scanned_material_id)
            if custom_project:
                print(f"Saving custom project to database: {custom_project}")
                print(f"Custom project steps being saved: {custom_project.get('steps', [])}")
                if custom_project.get('steps'):
                    print(f"Custom project first step length being saved: {len(str(custom_project['steps'][0]))}")
                    print(f"Custom project first step content being saved: {str(custom_project['steps'][0])}")
                doc_ref = db.collection('Recycling').document()
                doc_ref.set(custom_project)
                added_projects.append({
                    'id': doc_ref.id,
                    **custom_project
                })
                print(f"Added Gemini-generated custom project: {custom_project['project_name']}")
            else:
                print(f"Failed to generate custom project for {material_name}")
        
        # If the table was completely empty, generate 2-3 additional creative projects for variety
        if material_name and existing_count == 0:
            print(f"Table was empty, generating additional Gemini projects for {material_name}")
            # Generate 2-3 additional creative projects for variety
            for i in range(2):
                try:
                    additional_project = create_custom_recycling_project(material_name, material_traits, f"{scanned_material_id}_extra_{i}")
                    if additional_project:
                        # Make the project name unique
                        additional_project['project_name'] = f"{additional_project['project_name']} (Variation {i+1})"
                        doc_ref = db.collection('Recycling').document()
                        doc_ref.set(additional_project)
                        added_projects.append({
                            'id': doc_ref.id,
                            **additional_project
                        })
                        print(f"Added additional Gemini project: {additional_project['project_name']}")
                except Exception as e:
                    print(f"Error generating additional project {i}: {e}")
                    break
        
        print(f"Total projects added: {len(added_projects)}")
        
        return jsonify({
            'message': f'Successfully added {len(added_projects)} recycling projects',
            'projects': added_projects
        }), 201
        
    except Exception as e:
        print(f"Error populating recycling table: {e}")
        return jsonify({'error': str(e)}), 500

def create_custom_recycling_project(material_name, material_traits, material_id):
    """Create a custom recycling project for a specific material using Gemini API"""
    try:
        print(f"Creating custom project - material_name: '{material_name}', material_id: '{material_id}', traits: {material_traits}")
        
        # Get existing projects for this material to avoid redundancy
        existing_projects = []
        try:
            if db is not None:
                # Get all projects from the Recycling collection
                projects_ref = db.collection('Recycling')
                docs = projects_ref.stream()
                
                for doc in docs:
                    project_data = doc.to_dict()
                    project_material = project_data.get('material_name', '').lower()
                    material_lower = material_name.lower()
                    
                    # Check if this project is relevant to the current material
                    if (material_lower in project_material or 
                        project_material in material_lower or
                        any(trait.lower() in project_material for trait in material_traits)):
                        existing_projects.append({
                            'project_name': project_data.get('project_name', ''),
                            'material_name': project_data.get('material_name', ''),
                            'steps_count': len(project_data.get('steps', []))
                        })
        except Exception as e:
            print(f"Error fetching existing projects: {e}")
        
        print(f"Found {len(existing_projects)} existing projects for material '{material_name}': {[p['project_name'] for p in existing_projects]}")
        
        # Create a detailed prompt for Gemini
        traits_text = ", ".join(material_traits) if material_traits else "no specific traits"
        
        # Build existing projects text
        existing_projects_text = ""
        if existing_projects:
            existing_projects_text = f"""
        
        EXISTING PROJECTS FOR THIS MATERIAL (avoid creating similar ones):
        {chr(10).join([f"- {p['project_name']} ({p['material_name']}) - {p['steps_count']} steps" for p in existing_projects])}
        
        IMPORTANT: Create a completely different and unique project that is NOT similar to any of the above existing projects.
        """
        
        prompt = f"""
        You are a creative recycling expert. Generate a unique and practical upcycling project for this specific material:
        
        Material: {material_name}
        Traits: {traits_text}{existing_projects_text}
        
        Create a creative, environmentally-friendly upcycling project that transforms this material into something useful and beautiful. 
        The project should be:
        1. Practical and achievable for beginners to intermediate crafters
        2. Environmentally beneficial (reduces waste)
        3. Creative and unique (not just basic recycling)
        4. Safe to make
        5. Results in something useful or decorative
        6. COMPLETELY DIFFERENT from any existing projects listed above
        
        Return ONLY with this exact structure, do not include the json tag:
        {{
            "project_name": "Creative project name (max 50 characters)",
            "required_traits": ["Clean", "Intact", "Additional relevant traits based on material"],
            "steps": [
                "Detailed step and instruction"
            ]
        }}
        
        Make the project name creative and descriptive. Include 3-5 required traits that are relevant to the material and project.
        Provide detailed, actionable steps that someone can follow to complete the project.
        Be specific about tools, materials, and techniques needed.
        Use as many steps as needed.
        Ensure this project is unique and different from existing ones.
        """
        
        print(f"Generating custom project for {material_name} using Gemini API...")
        
        # Call Gemini API
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt]
        )
        
        # Log raw Gemini response
        print(f"Raw Gemini response: {response.text}")
        print(f"Raw Gemini response length: {len(response.text)}")
        
        # Parse the response
        project_data = _json.loads(response.text.strip())
        print(f"Parsed project data: {project_data}")
        
        # Validate and clean the data
        project_name = str(project_data.get('project_name', f'{material_name} Upcycling Project'))
        required_traits = project_data.get('required_traits', ['Clean', 'Intact'])
        steps = project_data.get('steps', [])
        
        print(f"Initial steps from Gemini: {steps}")
        print(f"Initial steps count: {len(steps)}")
        if steps:
            print(f"First step length: {len(str(steps[0]))}")
            print(f"First step content: {str(steps[0])}")
        
        # Ensure we have valid data
        if not isinstance(required_traits, list):
            required_traits = ['Clean', 'Intact']
        if not isinstance(steps, list) or len(steps) < 1:
            print("Using fallback steps due to invalid data")
            steps = [
                f"Clean the {material_name.lower()} thoroughly",
                "Prepare materials and tools needed",
                "Follow the upcycling design plan",
                "Assemble and decorate as desired",
                "Complete and enjoy your creation!"
            ]
        
        # Ensure steps are strings
        steps = [str(step) for step in steps]  # Keep all steps without character limit
        print(f"Final steps after processing: {steps}")
        print(f"Final steps count: {len(steps)}")
        if steps:
            print(f"Final first step length: {len(steps[0])}")
            print(f"Final first step content: {steps[0]}")
        
        # Ensure required traits are reasonable
        required_traits = [str(trait)[:30] for trait in required_traits[:5]]  # Limit traits
        
        custom_project = {
            'material_name': material_name,
            'project_image': f'/images/{material_name.lower().replace(" ", "-")}-project.jpg',
            'project_name': project_name,
            'required_traits': required_traits,
            'steps': steps
        }
        
        print(f"Custom project to be returned: {custom_project}")
        print(f"Steps being returned: {custom_project['steps']}")
        print(f"Steps count being returned: {len(custom_project['steps'])}")
        if custom_project['steps']:
            print(f"First step being returned - length: {len(custom_project['steps'][0])}")
            print(f"First step being returned - content: {custom_project['steps'][0]}")
        
        return custom_project
        
    except Exception as e:
        print(f"Error creating custom project with Gemini: {e}")
        # Return None if Gemini fails - no fallback projects
        return None


@app.route('/recycling/generate-custom', methods=['POST'])
def generate_custom_project():
    """Generate a single custom recycling project for a specific material"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json() or {}
        material_name = data.get('material_name', '')
        material_traits = data.get('material_traits', [])
        scanned_material_id = data.get('scanned_material_id', '')
        
        if not material_name:
            return jsonify({'error': 'Material name is required'}), 400
        
        print(f"Generating custom project for material: '{material_name}' (ID: '{scanned_material_id}')")
        
        # Generate custom project using Gemini
        custom_project = create_custom_recycling_project(material_name, material_traits, scanned_material_id)
        
        if custom_project:
            print(f"Saving generated custom project to database: {custom_project}")
            print(f"Generated custom project steps: {custom_project.get('steps', [])}")
            if custom_project.get('steps'):
                print(f"Generated custom project first step length: {len(str(custom_project['steps'][0]))}")
                print(f"Generated custom project first step content: {str(custom_project['steps'][0])}")
            
            # Save to database
            doc_ref = db.collection('Recycling').document()
            doc_ref.set(custom_project)
            custom_project['id'] = doc_ref.id
            
            print(f"Generated and saved custom project: {custom_project['project_name']}")
            
            return jsonify({
                'success': True,
                'message': 'Custom project generated successfully',
                'project': custom_project
            }), 201
        else:
            return jsonify({'error': 'Failed to generate custom project'}), 500
        
    except Exception as e:
        print(f"Error generating custom project: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/recycling/test-populate', methods=['POST'])
def test_populate_recycling_table():
    """Test endpoint to populate recycling table without duplicate checking"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Simple test project
        test_project = {
            'material_name': 'Test Material',
            'project_image': '/images/test.jpg',
            'project_name': 'Test Project',
            'required_traits': ['Small', 'Clean'],
            'steps': [
                'Clean material',
                'Cut material into shapes',
                'Stick items together'
            ]
        }
        
        # Add test project directly
        doc_ref = db.collection('Recycling').document()
        doc_ref.set(test_project)
        
        return jsonify({
            'message': 'Test project added successfully',
            'project_id': doc_ref.id,
            'project': test_project
        }), 201
        
    except Exception as e:
        print(f"Error in test populate: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/recycling/debug', methods=['GET'])
def debug_recycling_collection():
    """Debug endpoint to check the current state of the Recycling collection"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get all documents from Recycling collection
        projects_ref = db.collection('Recycling')
        docs = projects_ref.stream()
        
        projects = []
        for doc in docs:
            project_data = doc.to_dict()
            project_data['id'] = doc.id
            projects.append(project_data)
        
        return jsonify({
            'total_projects': len(projects),
            'projects': projects
        })
        
    except Exception as e:
        print(f"Error debugging recycling collection: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/recycling/clear', methods=['DELETE'])
def clear_recycling_table():
    """Clear all projects from the Recycling collection"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get all documents and delete them
        docs = db.collection('Recycling').stream()
        deleted_count = 0
        
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        
        return jsonify({
            'message': f'Successfully deleted {deleted_count} recycling projects',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        print(f"Error clearing recycling table: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/recycling', methods=['GET'])
def get_all_recycling_projects():
    """Get all recycling projects from the Recycling collection"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get all documents from Recycling collection
        projects_ref = db.collection('Recycling')
        docs = projects_ref.stream()
        
        projects = []
        for doc in docs:
            project_data = doc.to_dict()
            project_data['id'] = doc.id
            projects.append(project_data)
        
        return jsonify({
            'projects': projects,
            'count': len(projects)
        })
        
    except Exception as e:
        print(f"Error fetching all recycling projects: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/posts', methods=['GET', 'POST'])
def posts():
    """GET: Fetch all posts with media, likes, and comments
       POST: Create a new post"""
    
    if request.method == 'GET':
        try:
            if db is None:
                return jsonify({'error': 'Database not initialized'}), 500

            posts_ref = db.collection('Posts').order_by("created_at", direction=firestore.Query.DESCENDING).stream()
            posts = []

            for post_doc in posts_ref:
                post_data = post_doc.to_dict()
                post_id = post_doc.id

                # Fetch media (without ordering to avoid index requirement)
                media_docs = db.collection('Post_Media').where('post_id', '==', post_id).stream()
                media = [m.to_dict() for m in media_docs]
                # Sort media by order_index in Python instead
                media.sort(key=lambda x: x.get('order_index', 0))

                # Fetch likes (doc id is the post id)
                likes_doc = db.collection('Post_Likes').document(post_id).get()
                likes = likes_doc.to_dict().get("user_id", []) if likes_doc.exists else []

                # Fetch comments (without ordering to avoid index requirement)
                comments_docs = db.collection('Post_Comments').where('post_id', '==', post_id).stream()
                comments = [c.to_dict() for c in comments_docs]
                # Sort comments by created_at in Python instead
                comments.sort(key=lambda x: x.get('created_at', ''))

                posts.append({
                    "id": post_id,
                    "user_id": post_data.get("user_id"),
                    "content_text": post_data.get("content_text"),
                    "status": post_data.get("status"),
                    "created_at": post_data.get("created_at"),
                    "updated_at": post_data.get("updated_at"),
                    "media": media,
                    "likes": likes,
                    "comments": comments
                })

            return jsonify(posts)

        except Exception as e:
            print(f"Error fetching posts: {e}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            if db is None:
                return jsonify({'error': 'Database not initialized'}), 500
            
            data = request.get_json()
            user_id = data.get('user_id')
            content_text = data.get('content_text')
            status = data.get('status', 'published')
            
            if not user_id or not content_text:
                return jsonify({'error': 'Missing user_id or content_text'}), 400
            
            # Create new post document
            post_ref = db.collection('Posts').document()
            post_data = {
                'user_id': user_id,
                'content_text': content_text,
                'status': status,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            post_ref.set(post_data)
            
            print(f"Created new post {post_ref.id} for user {user_id}")
            return jsonify({'success': True, 'post_id': post_ref.id, 'message': 'Post created successfully'})
            
        except Exception as e:
            print(f"Error creating post: {e}")
            return jsonify({'error': str(e)}), 500

@app.route('/posts/<post_id>/like', methods=['POST'])
def like_post(post_id):
    """Toggle like for a post"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        doc_ref = db.collection('Post_Likes').document(post_id)
        doc = doc_ref.get()

        if doc.exists:
            # Get current likes array
            current_data = doc.to_dict()
            likes = current_data.get("user_id", [])
            
            if user_id in likes:
                # Unlike - remove user_id from array
                likes.remove(user_id)
                doc_ref.update({
                    "user_id": likes
                })
                print(f"Removed like from user {user_id} for post {post_id}")
                return jsonify({"liked": False, "message": "Like removed"})
            else:
                # Like - add user_id to array
                likes.append(user_id)
                doc_ref.update({
                    "user_id": likes
                })
                print(f"Added like from user {user_id} for post {post_id}")
                return jsonify({"liked": True, "message": "Post liked"})
        else:
            # Create new doc if post has no likes yet
            doc_ref.set({"user_id": [user_id]})
            print(f"Created new likes document for post {post_id} with user {user_id}")
            return jsonify({"liked": True, "message": "Post liked"})

    except Exception as e:
        print(f"Error liking post: {e}")
        return jsonify({"error": str(e)}), 500

from datetime import datetime

@app.route('/posts/<post_id>/comment', methods=['POST'])
def comment_post(post_id):
    """Add a comment to a post"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        comment_text = data.get("comment_text")

        if not user_id or not comment_text:
            return jsonify({"error": "Missing user_id or comment_text"}), 400

        comment_ref = db.collection("Post_Comments").document()
        comment_data = {
            "post_id": post_id,
            "user_id": user_id,
            "comment_text": comment_text,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        comment_ref.set(comment_data)

        return jsonify({"success": True, "comment": {**comment_data, "id": comment_ref.id}})
    except Exception as e:
        print(f"Error adding comment: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/user/<user_id>/eula', methods=['GET', 'POST'])
def handle_eula(user_id):
    """GET: Check if user has accepted EULA
       POST: Update user's EULA acceptance status"""
    
    if request.method == 'GET':
        try:
            if db is None:
                return jsonify({'error': 'Database not initialized'}), 500
            
            # Get user document
            user_doc = db.collection('User_collection').document(user_id).get()
            
            if not user_doc.exists:
                return jsonify({'eulaAccepted': False, 'isNewUser': True})
            
            user_data = user_doc.to_dict()
            eula_accepted = user_data.get('eulaAccepted', False)
            
            return jsonify({
                'eulaAccepted': eula_accepted,
                'isNewUser': False,
                'eulaAcceptedAt': user_data.get('eulaAcceptedAt')
            })
            
        except Exception as e:
            print(f"Error checking EULA status: {e}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            if db is None:
                return jsonify({'error': 'Database not initialized'}), 500
            
            data = request.get_json()
            eula_accepted = data.get('eulaAccepted', False)
            
            if not isinstance(eula_accepted, bool):
                return jsonify({'error': 'eulaAccepted must be a boolean'}), 400
            
            # Get user document
            user_doc = db.collection('User_collection').document(user_id).get()
            
            if user_doc.exists:
                # Update existing user document
                update_data = {
                    'eulaAccepted': eula_accepted,
                    'eulaAcceptedAt': datetime.utcnow() if eula_accepted else None
                }
                db.collection('User_collection').document(user_id).update(update_data)
                print(f"Updated EULA status for user {user_id}: {eula_accepted}")
            else:
                # Create new user document with EULA status
                user_data = {
                    'eulaAccepted': eula_accepted,
                    'eulaAcceptedAt': datetime.utcnow() if eula_accepted else None,
                    'createdAt': datetime.utcnow()
                }
                db.collection('User_collection').document(user_id).set(user_data)
                print(f"Created new user document for {user_id} with EULA status: {eula_accepted}")
            
            return jsonify({
                'success': True,
                'eulaAccepted': eula_accepted,
                'message': 'EULA status updated successfully'
            })
            
        except Exception as e:
            print(f"Error updating EULA status: {e}")
            return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/profile', methods=['GET', 'POST'])
def handle_profile(user_id):
    """GET: Check if user has completed their profile
       POST: Update user's profile data"""
    
    if request.method == 'GET':
        try:
            if db is None:
                return jsonify({'error': 'Database not initialized'}), 500
            
            # Get user document
            user_doc = db.collection('User_collection').document(user_id).get()
            
            if not user_doc.exists:
                return jsonify({'profileCompleted': False, 'isNewUser': True})
            
            user_data = user_doc.to_dict()
            profile_completed = user_data.get('profileCompleted', False)
            
            # Extract profile data
            profile_data = {
                'firstName': user_data.get('firstName'),
                'lastName': user_data.get('lastName'),
                'age': user_data.get('age'),
                'location': user_data.get('location'),
                'interests': user_data.get('interests'),
                'profileCreatedAt': user_data.get('profileCreatedAt')
            }
            
            return jsonify({
                'profileCompleted': profile_completed,
                'profileData': profile_data,
                'isNewUser': False
            })
            
        except Exception as e:
            print(f"Error checking profile completion: {e}")
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            if db is None:
                return jsonify({'error': 'Database not initialized'}), 500
            
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['firstName', 'lastName', 'age', 'profileCompleted']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Validate age
            try:
                age = int(data['age'])
                if age < 18 or age > 120:
                    return jsonify({'error': 'Age must be between 18 and 120'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Age must be a valid number'}), 400
            
            # Get user document
            user_doc = db.collection('User_collection').document(user_id).get()
            
            if user_doc.exists:
                # Update existing user document
                update_data = {
                    'firstName': data['firstName'],
                    'lastName': data['lastName'],
                    'age': age,
                    'location': data.get('location', ''),
                    'interests': data.get('interests', ''),
                    'profileCompleted': data['profileCompleted'],
                    'profileCreatedAt': data.get('profileCreatedAt', datetime.utcnow())
                }
                db.collection('User_collection').document(user_id).update(update_data)
                print(f"Updated profile for user {user_id}")
            else:
                # Create new user document with profile data
                user_data = {
                    'firstName': data['firstName'],
                    'lastName': data['lastName'],
                    'age': age,
                    'location': data.get('location', ''),
                    'interests': data.get('interests', ''),
                    'profileCompleted': data['profileCompleted'],
                    'profileCreatedAt': data.get('profileCreatedAt', datetime.utcnow()),
                    'createdAt': datetime.utcnow()
                }
                db.collection('User_collection').document(user_id).set(user_data)
                print(f"Created new user document for {user_id} with profile data")
            
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully'
            })
            
        except Exception as e:
            print(f"Error updating profile: {e}")
            return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/profile-image', methods=['POST'])
def upload_profile_image(user_id):
    """Upload a profile image for a user"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Check if user exists
        user_doc = db.collection('User_collection').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if file is present in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, WEBP'}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'}), 400
        
        # Generate unique filename
        filename = generate_unique_filename(user_id, file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save file
        file.save(file_path)
        
        # Process image (resize, crop, optimize)
        if not process_profile_image(file_path):
            # Clean up file if processing failed
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': 'Failed to process image'}), 500
        
        # Generate URL for the image
        image_url = f"/uploads/profile_images/{filename}"
        
        # Update user document with image URL
        db.collection('User_collection').document(user_id).update({
            'profileImageUrl': image_url,
            'profileImageUpdatedAt': datetime.utcnow()
        })
        
        print(f"Profile image uploaded for user {user_id}: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'Profile image uploaded successfully',
            'imageUrl': image_url
        })
        
    except Exception as e:
        print(f"Error uploading profile image: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/profile-image', methods=['GET'])
def get_profile_image(user_id):
    """Get user's profile image URL"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        image_url = user_data.get('profileImageUrl')
        
        if not image_url:
            return jsonify({
                'success': True,
                'hasImage': False,
                'message': 'No profile image found'
            })
        
        # Check if file actually exists
        filename = image_url.split('/')[-1]
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        
        if not os.path.exists(file_path):
            # Clean up database reference if file doesn't exist
            db.collection('User_collection').document(user_id).update({
                'profileImageUrl': None
            })
            return jsonify({
                'success': True,
                'hasImage': False,
                'message': 'Profile image file not found'
            })
        
        return jsonify({
            'success': True,
            'hasImage': True,
            'imageUrl': image_url,
            'updatedAt': user_data.get('profileImageUpdatedAt')
        })
        
    except Exception as e:
        print(f"Error getting profile image: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/profile-image', methods=['DELETE'])
def delete_profile_image(user_id):
    """Delete user's profile image"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        image_url = user_data.get('profileImageUrl')
        
        if image_url:
            # Delete file from filesystem
            filename = image_url.split('/')[-1]
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Deleted profile image file: {filename}")
            
            # Remove from database
            db.collection('User_collection').document(user_id).update({
                'profileImageUrl': None,
                'profileImageUpdatedAt': None
            })
            
            return jsonify({
                'success': True,
                'message': 'Profile image deleted successfully'
            })
        else:
            return jsonify({
                'success': True,
                'message': 'No profile image to delete'
            })
        
    except Exception as e:
        print(f"Error deleting profile image: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/quests/generate', methods=['POST'])
def generate_new_quests():
    """Generate new quests using Gemini API when database is running low"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json() or {}
        min_quests = data.get('min_quests', 5)  # Minimum number of quests to maintain
        quests_to_generate = data.get('quests_to_generate', 10)  # Number of new quests to generate
        
        # Check current quest count
        current_quests = db.collection('Quests').where('is_active', '==', True).stream()
        current_count = len(list(current_quests))
        
        print(f"Current active quests: {current_count}")
        
        # Only generate if we're below the minimum threshold
        if current_count >= min_quests:
            return jsonify({
                'success': True,
                'message': f'Sufficient quests available ({current_count}). No generation needed.',
                'current_count': current_count,
                'generated_count': 0
            })
        
        # Generate new quests using Gemini API
        generated_quests = generate_quests_with_gemini(quests_to_generate)
        
        if not generated_quests:
            return jsonify({'error': 'Failed to generate quests'}), 500
        
        # Insert generated quests into database
        inserted_count = 0
        for quest_data in generated_quests:
            try:
                quest_ref = db.collection('Quests').document()
                quest_data['id'] = quest_ref.id
                quest_data['created_at'] = datetime.utcnow()
                quest_data['updated_at'] = datetime.utcnow()
                quest_ref.set(quest_data)
                inserted_count += 1
                print(f"Inserted quest: {quest_data['title']}")
            except Exception as e:
                print(f"Error inserting quest: {e}")
                continue
        
        return jsonify({
            'success': True,
            'message': f'Generated {inserted_count} new quests',
            'current_count': current_count + inserted_count,
            'generated_count': inserted_count,
            'quests': generated_quests[:5]  # Return first 5 for preview
        })
        
    except Exception as e:
        print(f"Error generating quests: {e}")
        return jsonify({'error': str(e)}), 500


def generate_quests_with_gemini(count=10):
    """Generate quest content using Gemini API"""
    try:
        # Quest categories and their characteristics
        categories = [
            {
                'name': 'scanning',
                'icon': 'camera-alt',
                'description': 'Camera-based item identification quests',
                'types': ['scan', 'identify', 'categorize']
            },
            {
                'name': 'community',
                'icon': 'people',
                'description': 'Social sharing and engagement quests',
                'types': ['share', 'post', 'comment', 'like']
            },
            {
                'name': 'recycling',
                'icon': 'recycling',
                'description': 'Physical recycling activities',
                'types': ['recycle', 'collect', 'sort', 'dispose']
            },
            {
                'name': 'upcycling',
                'icon': 'build',
                'description': 'Creative waste transformation',
                'types': ['transform', 'create', 'craft', 'repurpose']
            },
            {
                'name': 'profile',
                'icon': 'person',
                'description': 'Account setup and profile completion',
                'types': ['complete', 'update', 'verify']
            }
        ]
        
        # Generate quests for each category
        generated_quests = []
        
        for i in range(count):
            category = random.choice(categories)
            quest_type = random.choice(category['types'])
            
            # Create prompt for Gemini
            prompt = f"""
            Generate a creative and engaging quest for a waste-to-worth mobile app. 
            
            Category: {category['name']}
            Type: {quest_type}
            Icon: {category['icon']}
            
            Create a quest that:
            1. Is environmentally focused and educational
            2. Encourages sustainable behavior
            3. Is achievable but challenging
            4. Has clear, measurable objectives
            5. Is engaging and fun
            
            Return ONLY a JSON object with this exact structure:
            {{
                "title": "Creative quest title (max 50 characters)",
                "description": "Detailed quest description (max 200 characters)",
                "points": [25, 50, 100, 150, 200, 300],
                "type": "{quest_type}",
                "category": "{category['name']}",
                "target_count": [1, 3, 5, 10, 15, 20, 25, 30],
                "icon": "{category['icon']}",
                "difficulty_level": ["easy", "medium", "hard"],
                "is_active": true,
                "is_repeatable": [true, false]
            }}
            
            Make it unique and different from typical quests. Focus on environmental impact and user engagement.
            """
            
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[prompt]
                )
                
                # Parse the response
                quest_data = _json.loads(response.text.strip())
                
                # Validate and clean the data
                quest_data = validate_quest_data(quest_data, category)
                generated_quests.append(quest_data)
                
            except Exception as e:
                print(f"Error generating quest with Gemini: {e}")
                # Fallback to predefined quest if Gemini fails
                fallback_quest = create_fallback_quest(category, quest_type)
                generated_quests.append(fallback_quest)
        
        return generated_quests
        
    except Exception as e:
        print(f"Error in generate_quests_with_gemini: {e}")
        return []


def validate_quest_data(quest_data, category):
    """Validate and clean quest data from Gemini"""
    try:
        # Ensure required fields exist
        required_fields = ['title', 'description', 'points', 'type', 'category', 'target_count', 'icon', 'difficulty_level']
        
        for field in required_fields:
            if field not in quest_data:
                quest_data[field] = get_default_value(field, category)
        
        # Validate and clean specific fields
        quest_data['title'] = str(quest_data['title'])[:50]  # Limit title length
        quest_data['description'] = str(quest_data['description'])[:200]  # Limit description length
        
        # Ensure points is a valid number
        try:
            quest_data['points'] = int(quest_data['points'])
            if quest_data['points'] < 25:
                quest_data['points'] = 25
            elif quest_data['points'] > 300:
                quest_data['points'] = 300
        except (ValueError, TypeError):
            quest_data['points'] = random.choice([25, 50, 100, 150, 200, 300])
        
        # Ensure target_count is valid
        try:
            quest_data['target_count'] = int(quest_data['target_count'])
            if quest_data['target_count'] < 1:
                quest_data['target_count'] = 1
            elif quest_data['target_count'] > 50:
                quest_data['target_count'] = 50
        except (ValueError, TypeError):
            quest_data['target_count'] = random.choice([1, 3, 5, 10, 15, 20])
        
        # Ensure difficulty_level is valid
        if quest_data['difficulty_level'] not in ['easy', 'medium', 'hard']:
            quest_data['difficulty_level'] = random.choice(['easy', 'medium', 'hard'])
        
        # Ensure boolean fields
        quest_data['is_active'] = bool(quest_data.get('is_active', True))
        quest_data['is_repeatable'] = bool(quest_data.get('is_repeatable', False))
        
        return quest_data
        
    except Exception as e:
        print(f"Error validating quest data: {e}")
        return create_fallback_quest(category, 'general')


def get_default_value(field, category):
    """Get default values for quest fields"""
    defaults = {
        'title': f"New {category['name'].title()} Quest",
        'description': f"Complete this {category['name']} quest to earn points and help the environment.",
        'points': random.choice([25, 50, 100, 150, 200, 300]),
        'type': 'general',
        'category': category['name'],
        'target_count': random.choice([1, 3, 5, 10, 15, 20]),
        'icon': category['icon'],
        'difficulty_level': random.choice(['easy', 'medium', 'hard']),
        'is_active': True,
        'is_repeatable': False
    }
    return defaults.get(field, '')


def create_fallback_quest(category, quest_type):
    """Create a fallback quest if Gemini generation fails"""
    fallback_templates = {
        'scan': {
            'title': f"Scan {random.choice([5, 10, 15, 20])} {category['name']} Items",
            'description': f"Use the camera to scan and identify {random.choice([5, 10, 15, 20])} different {category['name']} items.",
            'points': random.choice([50, 100, 150]),
            'target_count': random.choice([5, 10, 15, 20])
        },
        'community': {
            'title': f"Share {random.choice([3, 5, 7])} Community Posts",
            'description': f"Post helpful {category['name']} tips or projects in the community.",
            'points': random.choice([75, 150, 225]),
            'target_count': random.choice([3, 5, 7])
        },
        'recycle': {
            'title': f"Recycle {random.choice([10, 20, 30])} {category['name'].title()} Items",
            'description': f"Collect and properly recycle {random.choice([10, 20, 30])} {category['name']} items.",
            'points': random.choice([100, 200, 300]),
            'target_count': random.choice([10, 20, 30])
        },
        'upcycle': {
            'title': f"Upcycle {random.choice([2, 3, 5])} {category['name'].title()} Items",
            'description': f"Transform {random.choice([2, 3, 5])} waste items into useful household items.",
            'points': random.choice([150, 250, 350]),
            'target_count': random.choice([2, 3, 5])
        },
        'profile': {
            'title': f"Complete Your {category['name'].title()} Profile",
            'description': f"Fill out your complete {category['name']} profile information.",
            'points': 50,
            'target_count': 1
        }
    }
    
    template = fallback_templates.get(quest_type, fallback_templates['scan'])
    
    return {
        'title': template['title'],
        'description': template['description'],
        'points': template['points'],
        'type': quest_type,
        'category': category['name'],
        'target_count': template['target_count'],
        'icon': category['icon'],
        'difficulty_level': random.choice(['easy', 'medium', 'hard']),
        'is_active': True,
        'is_repeatable': random.choice([True, False])
    }


@app.route('/quests', methods=['GET'])
def get_quests():
    """Get all active quests from the database"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get all active quests
        quests_ref = db.collection('Quests').where('is_active', '==', True).stream()
        quests = []
        
        for quest_doc in quests_ref:
            quest_data = quest_doc.to_dict()
            quest_data['id'] = quest_doc.id
            quests.append(quest_data)
        
        return jsonify({
            'success': True,
            'quests': quests,
            'count': len(quests)
        })
        
    except Exception as e:
        print(f"Error fetching quests: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/quests/progress', methods=['GET'])
def get_user_quest_progress(user_id):
    """Get user's quest progress"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user's quest progress
        progress_ref = db.collection('User_Quest_Progress').where('user_id', '==', user_id).stream()
        progress_data = []
        
        for progress_doc in progress_ref:
            progress = progress_doc.to_dict()
            progress['id'] = progress_doc.id
            progress_data.append(progress)
        
        return jsonify({
            'success': True,
            'progress': progress_data,
            'count': len(progress_data)
        })
        
    except Exception as e:
        print(f"Error fetching user quest progress: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/quests/progress', methods=['POST'])
def update_user_quest_progress(user_id):
    """Update user's quest progress"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json()
        quest_id = data.get('quest_id')
        progress_increment = data.get('increment', 1)
        
        if not quest_id:
            return jsonify({'error': 'Missing quest_id'}), 400
        
        # Check if user already has progress for this quest
        progress_query = db.collection('User_Quest_Progress').where('user_id', '==', user_id).where('quest_id', '==', quest_id).stream()
        progress_docs = list(progress_query)
        
        if progress_docs:
            # Update existing progress
            progress_doc = progress_docs[0]
            current_progress = progress_doc.to_dict().get('current_progress', 0)
            new_progress = current_progress + progress_increment
            
            # Get quest details to check if completed
            quest_doc = db.collection('Quests').document(quest_id).get()
            if quest_doc.exists:
                quest_data = quest_doc.to_dict()
                target_count = quest_data.get('target_count', 1)
                points = quest_data.get('points', 0)
                
                is_completed = new_progress >= target_count
                points_earned = points if is_completed and current_progress < target_count else 0
                
                # Update progress
                progress_doc.reference.update({
                    'current_progress': new_progress,
                    'is_completed': is_completed,
                    'completed_at': datetime.utcnow() if is_completed else None,
                    'points_earned': points_earned,
                    'updated_at': datetime.utcnow()
                })
                
                return jsonify({
                    'success': True,
                    'progress': new_progress,
                    'is_completed': is_completed,
                    'points_earned': points_earned,
                    'message': 'Quest completed!' if is_completed else 'Progress updated'
                })
            else:
                return jsonify({'error': 'Quest not found'}), 404
        else:
            # Create new progress entry
            quest_doc = db.collection('Quests').document(quest_id).get()
            if quest_doc.exists:
                quest_data = quest_doc.to_dict()
                target_count = quest_data.get('target_count', 1)
                points = quest_data.get('points', 0)
                
                new_progress = progress_increment
                is_completed = new_progress >= target_count
                points_earned = points if is_completed else 0
                
                # Create new progress document
                progress_ref = db.collection('User_Quest_Progress').document()
                progress_data = {
                    'user_id': user_id,
                    'quest_id': quest_id,
                    'current_progress': new_progress,
                    'is_completed': is_completed,
                    'completed_at': datetime.utcnow() if is_completed else None,
                    'points_earned': points_earned,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                progress_ref.set(progress_data)
                
                return jsonify({
                    'success': True,
                    'progress': new_progress,
                    'is_completed': is_completed,
                    'points_earned': points_earned,
                    'message': 'Quest completed!' if is_completed else 'Progress updated'
                })
            else:
                return jsonify({'error': 'Quest not found'}), 404
        
    except Exception as e:
        print(f"Error updating quest progress: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/user/<user_id>/current-project', methods=['POST'])
def set_user_current_project(user_id):
    """Set a project as the user's current project"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json()
        project_id = data.get('project_id')
        
        if not project_id:
            return jsonify({'error': 'Project ID is required'}), 400
        
        # Verify the project exists
        project_doc = db.collection('Recycling').document(project_id).get()
        if not project_doc.exists:
            return jsonify({'error': 'Project not found'}), 404
        
        # Update user document with current project
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if user_doc.exists:
            # Update existing user document
            db.collection('User_collection').document(user_id).update({
                'current_project_id': project_id,
                'current_project_set_at': datetime.utcnow()
            })
        else:
            # Create new user document with current project
            db.collection('User_collection').document(user_id).set({
                'current_project_id': project_id,
                'current_project_set_at': datetime.utcnow(),
                'createdAt': datetime.utcnow()
            })
        
        print(f"Set current project {project_id} for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Current project set successfully',
            'project_id': project_id
        })
        
    except Exception as e:
        print(f"Error setting current project: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/user/<user_id>/current-project', methods=['GET'])
def get_user_current_project(user_id):
    """Get user's current project"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'current_project': None})
        
        user_data = user_doc.to_dict()
        current_project_id = user_data.get('current_project_id')
        
        if not current_project_id:
            return jsonify({'current_project': None})
        
        # Get project details
        project_doc = db.collection('Recycling').document(current_project_id).get()
        if project_doc.exists:
            project_data = project_doc.to_dict()
            project_data['id'] = project_doc.id
            return jsonify({'current_project': project_data})
        else:
            # Project was deleted, clear it from user
            db.collection('User_collection').document(user_id).update({
                'current_project_id': None,
                'current_project_set_at': None
            })
            return jsonify({'current_project': None})
        
    except Exception as e:
        print(f"Error getting current project: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/user/<user_id>/quests/stats', methods=['GET'])
def get_user_quest_stats(user_id):
    """Get user's quest statistics"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user's quest progress
        progress_ref = db.collection('User_Quest_Progress').where('user_id', '==', user_id).stream()
        progress_data = []
        
        for progress_doc in progress_ref:
            progress = progress_doc.to_dict()
            progress_data.append(progress)
        
        # Calculate stats
        completed_quests = [p for p in progress_data if p.get('is_completed', False)]
        total_points = sum(p.get('points_earned', 0) for p in completed_quests)
        total_quests = len(progress_data)
        
        # Get level based on points
        if total_points < 100:
            level = 'Eco Beginner'
        elif total_points < 300:
            level = 'Eco Explorer'
        elif total_points < 600:
            level = 'Eco Warrior'
        elif total_points < 1000:
            level = 'Eco Champion'
        elif total_points < 1500:
            level = 'Eco Master'
        else:
            level = 'Eco Legend'
        
        level_progress = (total_points % 500) / 500 * 100
        
        return jsonify({
            'success': True,
            'stats': {
                'total_points': total_points,
                'level': level,
                'level_progress': level_progress,
                'completed_quests': len(completed_quests),
                'total_quests': total_quests
            }
        })
        
    except Exception as e:
        print(f"Error fetching user quest stats: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/quests/check-and-generate', methods=['GET'])
def check_and_generate_quests():
    """Automatically check quest count and generate if needed"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Check current quest count
        current_quests = db.collection('Quests').where('is_active', '==', True).stream()
        current_count = len(list(current_quests))
        
        min_quests = 5  # Minimum threshold
        quests_to_generate = 10  # Number to generate if below threshold
        
        if current_count < min_quests:
            # Generate new quests
            generated_quests = generate_quests_with_gemini(quests_to_generate)
            
            if generated_quests:
                # Insert generated quests
                inserted_count = 0
                for quest_data in generated_quests:
                    try:
                        quest_ref = db.collection('Quests').document()
                        quest_data['id'] = quest_ref.id
                        quest_data['created_at'] = datetime.utcnow()
                        quest_data['updated_at'] = datetime.utcnow()
                        quest_ref.set(quest_data)
                        inserted_count += 1
                    except Exception as e:
                        print(f"Error inserting quest: {e}")
                        continue
                
                return jsonify({
                    'success': True,
                    'message': f'Generated {inserted_count} new quests automatically',
                    'previous_count': current_count,
                    'new_count': current_count + inserted_count,
                    'generated_count': inserted_count
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to generate new quests',
                    'current_count': current_count
                })
        else:
            return jsonify({
                'success': True,
                'message': f'Sufficient quests available ({current_count})',
                'current_count': current_count,
                'generated_count': 0
            })
            
    except Exception as e:
        print(f"Error in check_and_generate_quests: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/uploads/profile_images/<filename>')
def serve_profile_image(filename):
    """Serve profile images as static files"""
    try:
        from flask import send_from_directory
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        print(f"Error serving image {filename}: {e}")
        return jsonify({'error': 'Image not found'}), 404


if __name__ == '__main__':
    # Listen on all interfaces so the mobile device / emulator can reach it.
    app.run(host='0.0.0.0', port=5000, debug=True)