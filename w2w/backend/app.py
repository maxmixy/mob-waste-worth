import io
import os
import base64
import tempfile
import random
import uuid
import hashlib
import requests
from datetime import datetime
from PIL import Image
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google import genai
from google.genai import types
from google.genai.types import GenerationConfig

generation_config = GenerationConfig(
    response_mime_type="application/json"
)


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

def init_gemini():
    """Initialize Gemini API"""
    global client
    try:
        client = genai.Client(api_key="AIzaSyDRT3lI3JrVKvg41ZbIp1l2Hibilae7EWU")
    
        print("Gemini API initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing Gemini API: {e}")
        return False

db = init_firestore()

# Initialize Gemini API
gemini_initialized = init_gemini()

# Unsplash API setup
UNSPLASH_ACCESS_KEY = "1iBibObcGpjQYY_WbLkzlqZNIJ5I0AGoCMYu4o2JHec"  # Replace with your actual access key
UNSPLASH_BASE_URL = "https://api.unsplash.com"

app = Flask(__name__)
CORS(app)  # allow all origins for development; tighten in production

# Image upload configuration
UPLOAD_FOLDER = 'uploads/profile_images'
POST_IMAGES_FOLDER = 'uploads/posts'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
PROFILE_IMAGE_SIZE = (400, 400)  # Standard profile image size
POST_IMAGE_SIZE = (800, 600)  # Standard post image size

# Ensure upload directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(POST_IMAGES_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(user_id, original_filename):
    """Generate a unique filename for the user's profile image"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = original_filename.rsplit('.', 1)[1].lower()
    return f"{user_id}_{timestamp}.{extension}"

def generate_unique_post_filename(original_filename):
    """Generate a unique filename for post images"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    random_id = str(uuid.uuid4())[:8]
    extension = original_filename.rsplit('.', 1)[1].lower()
    return f"post_{timestamp}_{random_id}.{extension}"

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

def process_post_image(image_path):
    """Process and resize post image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize image while maintaining aspect ratio
            img.thumbnail(POST_IMAGE_SIZE, Image.Resampling.LANCZOS)
            
            # Save the processed image
            img.save(image_path, 'JPEG', quality=85, optimize=True)
            return True
    except Exception as e:
        print(f"Error processing post image: {e}")
        return False

def search_unsplash_for_material(material_name, num_images=3):
    """Search Unsplash for images related to the material"""
    try:
        print(f"[Unsplash API] Starting search for material: '{material_name}' (requesting {num_images} images)")
        if not UNSPLASH_ACCESS_KEY or UNSPLASH_ACCESS_KEY == "YOUR_UNSPLASH_ACCESS_KEY":
            print("[Unsplash API] API key not configured, skipping image search")
            return None
            
        # Clean up material name for better search results
        search_query = material_name.lower().strip()
        
        # Add recycling/waste context to improve search results
        search_terms = [
            f"{search_query} recycling",
            f"{search_query} waste",
            f"{search_query} material",
            search_query
        ]
        
        headers = {
            'Authorization': f'Client-ID {UNSPLASH_ACCESS_KEY}'
        }
        
        # Try different search terms until we find a good result
        for i, term in enumerate(search_terms):
            try:
                print(f"[Unsplash API] Trying search term {i+1}/{len(search_terms)}: '{term}'")
                response = requests.get(
                    f"{UNSPLASH_BASE_URL}/search/photos",
                    params={
                        'query': term,
                        'per_page': num_images,
                        'orientation': 'landscape'
                    },
                    headers=headers,
                    timeout=5
                )
                
                print(f"[Unsplash API] Response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"[Unsplash API] Response data keys: {list(data.keys())}")
                    print(f"[Unsplash API] Results count: {len(data.get('results', []))}")
                    
                    if data.get('results') and len(data['results']) > 0:
                        images = []
                        for j, photo in enumerate(data['results'][:num_images]):
                            print(f"[Unsplash API] Photo {j+1} data keys: {list(photo.keys())}")
                            print(f"[Unsplash API] Photo {j+1} URLs keys: {list(photo.get('urls', {}).keys())}")
                            
                            image_data = {
                                'url': photo['urls']['regular'],
                                'thumb': photo['urls']['thumb'],
                                'alt_description': photo.get('alt_description', ''),
                                'description': photo.get('description', ''),
                                'photographer': photo.get('user', {}).get('name', 'Unknown'),
                                'photographer_url': photo.get('user', {}).get('links', {}).get('html', ''),
                                'unsplash_url': photo.get('links', {}).get('html', '')
                            }
                            images.append(image_data)
                            print(f"[Unsplash API] Image {j+1} URL: {image_data['url']}")
                        
                        print(f"[Unsplash API] ✅ Found {len(images)} images for '{material_name}' using search term '{term}'")
                        return images
                    else:
                        print(f"[Unsplash API] No results found for search term: '{term}'")
                        print(f"[Unsplash API] Response data: {data}")
                else:
                    print(f"[Unsplash API] API error {response.status_code} for search term: '{term}'")
                    print(f"[Unsplash API] Error response: {response.text}")
                        
            except requests.RequestException as e:
                print(f"[Unsplash API] ❌ Request error for '{term}': {e}")
                continue
                
        print(f"[Unsplash API] ❌ No images found for material: {material_name}")
        return None
        
    except Exception as e:
        print(f"Error in search_unsplash_for_material: {e}")
        return None


def get_or_create_material_image_url(material_name, db):
    """Get existing image URL for material or create new one via Unsplash search"""
    try:
        print(f"[Image Cache] Checking cache for material: '{material_name}'")
        if not db:
            print("[Image Cache] ❌ Database not available")
            return None
            
        # First, check if we already have a valid image URL for this material name
        materials_with_image = db.collection('Materials').where('Name', '==', material_name).where('ImageUrl', '!=', '').limit(1).stream()
        
        for doc in materials_with_image:
            data = doc.to_dict()
            if data.get('ImageUrl') and data.get('ImageUrl').strip():  # Check for non-empty string
                print(f"[Image Cache] ✅ Found cached image URL for '{material_name}': {data['ImageUrl']}")
                return data['ImageUrl']
        
        # If no existing valid image URL, search Unsplash
        print(f"[Image Cache] ❌ No valid cached image URL found for '{material_name}', searching Unsplash...")
        images = search_unsplash_for_material(material_name)
        
        if images and len(images) > 0:
            # For existing materials, we'll use the first image as default
            # The user selection will be handled separately for new materials
            image_url = images[0]['url']
            
            # Update all materials with this name to include the image URL
            materials_to_update = db.collection('Materials').where('Name', '==', material_name).stream()
            updated_count = 0
            
            for doc in materials_to_update:
                doc.reference.update({'ImageUrl': image_url})
                updated_count += 1
                
            print(f"[Image Cache] ✅ Updated {updated_count} materials with name '{material_name}' to include image URL")
            return image_url
        else:
            print(f"[Image Cache] ❌ No images found for '{material_name}'")
        
        return None
        
    except Exception as e:
        print(f"Error in get_or_create_material_image_url: {e}")
        return None

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



@app.route('/select-material-image', methods=['POST'])
def select_material_image():
    """Create a material with the user's selected image"""
    try:
        data = request.get_json()
        if not data or 'material_data' not in data or 'selected_image_index' not in data:
            return jsonify({'error': 'Missing material_data or selected_image_index'}), 400
        
        material_data = data['material_data']
        selected_image_index = data['selected_image_index']
        
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Validate the material data
        if not material_data.get('Name'):
            return jsonify({'error': 'Invalid material data - missing name'}), 400
        
        # ImageOptions is required unless user selected "None Fit"
        if selected_image_index != -1 and not material_data.get('ImageOptions'):
            return jsonify({'error': 'Invalid material data - missing image options'}), 400
        
        # Handle the case where user selected "None Fit" (index -1)
        if selected_image_index == -1:
            image_url = ''
            selected_image = None
            print(f"User selected 'None Fit' for material: {material_data['Name']}")
        else:
            # Get the selected image
            image_options = material_data['ImageOptions']
            if selected_image_index < 0 or selected_image_index >= len(image_options):
                return jsonify({'error': 'Invalid image index'}), 400
            
            selected_image = image_options[selected_image_index]
            image_url = selected_image['url']
        
        # Create the material document
        doc_data = {
            'Name': material_data['Name'],
            'Traits': material_data.get('Traits', []),
            'ImageUrl': image_url
        }
        
        doc_ref = db.collection('Materials').document()
        doc_ref.set(doc_data)
        inserted_doc = {**doc_data, 'id': doc_ref.id}
        
        print(f"Created material with selected image: {material_data['Name']} -> {image_url}")
        
        return jsonify({
            'success': True,
            'material': inserted_doc,
            'selected_image': selected_image
        })
        
    except Exception as e:
        print(f"Error in select_material_image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/update-empty-images', methods=['POST'])
def update_empty_images():
    """Update all materials with empty ImageUrl fields"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        print("[Batch Update] Starting batch update of materials with empty ImageUrl fields...")
        
        # Find all materials with empty ImageUrl fields
        materials_to_update = db.collection('Materials').where('ImageUrl', '==', '').stream()
        
        updated_count = 0
        failed_count = 0
        results = []
        
        for doc in materials_to_update:
            try:
                data = doc.to_dict()
                material_name = data.get('Name', '')
                doc_id = doc.id
                
                if material_name:
                    print(f"[Batch Update] Processing material: '{material_name}' (ID: {doc_id})")
                    images = search_unsplash_for_material(material_name)
                    
                    if images and len(images) > 0:
                        # Use the first image for batch updates
                        image_url = images[0]['url']
                        doc.reference.update({'ImageUrl': image_url})
                        updated_count += 1
                        results.append({
                            'id': doc_id,
                            'name': material_name,
                            'image_url': image_url,
                            'status': 'success'
                        })
                        print(f"[Batch Update] ✅ Updated '{material_name}' with image URL")
                    else:
                        failed_count += 1
                        results.append({
                            'id': doc_id,
                            'name': material_name,
                            'image_url': None,
                            'status': 'no_image_found'
                        })
                        print(f"[Batch Update] ❌ No images found for '{material_name}'")
                else:
                    failed_count += 1
                    results.append({
                        'id': doc_id,
                        'name': 'Unknown',
                        'image_url': None,
                        'status': 'no_name'
                    })
                    print(f"[Batch Update] ❌ No name found for document {doc_id}")
                    
            except Exception as e:
                failed_count += 1
                results.append({
                    'id': doc.id,
                    'name': data.get('Name', 'Unknown'),
                    'image_url': None,
                    'status': f'error: {str(e)}'
                })
                print(f"[Batch Update] ❌ Error updating document {doc.id}: {e}")
        
        print(f"[Batch Update] Completed: {updated_count} updated, {failed_count} failed")
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'total_processed': len(results),
            'results': results
        })
        
    except Exception as e:
        print(f"[Batch Update] Error in batch update: {e}")
        return jsonify({'error': str(e)}), 500


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
        materials = []
        for doc in docs:
            material_data = doc.to_dict()
            materials.append({**material_data, 'id': doc.id})
        if not materials:
            material_name = material.get('Name')
            if not material_name:
                return jsonify({'error': 'Model did not return a Name field'}), 502
            
            # Get multiple image options for new material
            images = search_unsplash_for_material(material_name)
            
            if images and len(images) > 0:
                # Return the material with multiple image options for user selection
                material_data = {
                    'Name': material_name,
                    'Traits': normalized_traits,
                    'ImageUrl': '',  # Will be set after user selection
                    'ImageOptions': images  # Multiple image options
                }
                return jsonify({
                    'Scanned Material': [material_data], 
                    'inserted': False,  # Not inserted yet, waiting for user selection
                    'needs_image_selection': True
                })
            else:
                # No images found, create material without image
                doc_data = {
                    'Name': material_name,
                    'Traits': normalized_traits,
                    'ImageUrl': ''
                }
                
                doc_ref = db.collection('Materials').document()
                doc_ref.set(doc_data)
                inserted_doc = {**doc_data, 'id': doc_ref.id}
                return jsonify({'Scanned Material': [inserted_doc], 'inserted': True})

        # Check if any of the found materials need image URLs
        material_name = material.get('Name')
        if material_name:
            # Get or create image URL for this material (this will update existing materials if needed)
            image_url = get_or_create_material_image_url(material_name, db)
            
            # If we got a new image URL, update the materials in the response
            if image_url:
                for mat in materials:
                    if not mat.get('ImageUrl') or not mat.get('ImageUrl').strip():
                        mat['ImageUrl'] = image_url
        
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
        else:
            # Create new user document
            db.collection('User_collection').document(userId).set({
                'Materials': [materialId]
            })
        
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
            materials = []
            for doc in docs:
                material_data = doc.to_dict()
                materials.append(material_data)
            
            if materials:
                material_data = {**materials[0], 'id': material_id}
            else:
                return jsonify({'error': 'Material not found'}), 404
        else:
            material_data = {**material_doc.to_dict(), 'id': material_doc.id}
        
        
        return jsonify(material_data)
        
    except Exception as e:
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

@app.route('/user/<user_id>/materials/<material_id>', methods=['DELETE'])
def delete_user_material(user_id, material_id):
    """Remove a material ID from a user's scan history"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        materials = user_data.get('Materials', [])
        
        # Check if material exists in user's materials
        if material_id not in materials:
            return jsonify({'error': 'Material not found in user history'}), 404
        
        # Remove the material from the array
        materials.remove(material_id)
        
        # Update the user document
        db.collection('User_collection').document(user_id).update({
            'Materials': materials
        })
        
        print(f"🗑️ Removed material {material_id} from user {user_id}'s history")
        
        return jsonify({
            'success': True, 
            'message': 'Material removed from scan history successfully'
        })
        
    except Exception as e:
        print(f"Error deleting user material: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/user/<user_id>/location', methods=['POST'])
def update_user_location(user_id):
    """Update user's location data"""
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        accuracy = data.get('accuracy')
        timestamp = data.get('timestamp')
        
        if not all([latitude, longitude]):
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        # Update user document with location data
        location_data = {
            'latitude': latitude,
            'longitude': longitude,
            'accuracy': accuracy,
            'timestamp': timestamp,
            'lastUpdated': datetime.now().isoformat()
        }
        
        # Check if user document exists, create if not
        user_doc = db.collection('User_collection').document(user_id).get()
        if user_doc.exists:
            # Update existing user document
            db.collection('User_collection').document(user_id).update({
                'location': location_data
            })
        else:
            # Create new user document with location data
            db.collection('User_collection').document(user_id).set({
                'location': location_data,
                'Materials': []
            })
        
        return jsonify({
            'success': True,
            'message': 'Location updated successfully',
            'location': location_data
        })
        
    except Exception as e:
        print(f"Error updating user location: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/user/<user_id>/project/<project_id>/progress', methods=['GET'])
def get_project_progress(user_id, project_id):
    """Get project progress for a user"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        progress_data = user_data.get('project_progress', {}).get(project_id)
        
        if not progress_data:
            return jsonify({'error': 'No progress found for this project'}), 404
        
        return jsonify(progress_data)
        
    except Exception as e:
        print(f"Error fetching project progress: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/user/<user_id>/project/<project_id>/progress', methods=['POST'])
def update_project_progress(user_id, project_id):
    """Update project progress for a user"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json()
        step_index = data.get('stepIndex')
        is_completed = data.get('isCompleted')
        timestamp = data.get('timestamp')
        
        if step_index is None or is_completed is None:
            return jsonify({'error': 'stepIndex and isCompleted are required'}), 400
        
        # Get user document
        user_doc = db.collection('User_collection').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        project_progress = user_data.get('project_progress', {})
        
        # Get or create progress for this project
        if project_id not in project_progress:
            project_progress[project_id] = {
                'projectId': project_id,
                'completedSteps': [],
                'currentStep': 0,
                'startedAt': timestamp or datetime.now().isoformat(),
                'lastUpdated': timestamp or datetime.now().isoformat(),
                'isCompleted': False
            }
        
        progress = project_progress[project_id]
        
        # Update progress
        if is_completed:
            # When marking a step as completed, mark all previous steps as completed too
            for i in range(step_index + 1):
                if i not in progress['completedSteps']:
                    progress['completedSteps'].append(i)
        else:
            # When unmarking a step, also unmark all subsequent steps
            progress['completedSteps'] = [step for step in progress['completedSteps'] if step < step_index]
        
        # Update current step (next incomplete step)
        progress['completedSteps'].sort()
        progress['currentStep'] = len(progress['completedSteps'])
        progress['lastUpdated'] = timestamp or datetime.now().isoformat()
        
        # Check if project is completed
        # Get project to know total steps
        project_doc = db.collection('Recycling').document(project_id).get()
        if project_doc.exists:
            project_data = project_doc.to_dict()
            total_steps = len(project_data.get('steps', []))
            progress['isCompleted'] = len(progress['completedSteps']) >= total_steps
        
        # Update user document
        db.collection('User_collection').document(user_id).update({
            'project_progress': project_progress
        })
        
        return jsonify(progress)
        
    except Exception as e:
        print(f"Error updating project progress: {e}")
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
            image_paths = data.get('image_paths', [])  # Array of image paths from uploads
            
            if not user_id or (not content_text and not image_paths):
                return jsonify({'error': 'Missing user_id or both content_text and image_paths'}), 400
            
            # Create new post document
            post_ref = db.collection('Posts').document()
            post_data = {
                'user_id': user_id,
                'content_text': content_text or '',
                'status': status,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            post_ref.set(post_data)
            post_id = post_ref.id
            
            # Create Post_Media entries for each image
            if image_paths:
                for index, image_path in enumerate(image_paths):
                    media_data = {
                        'post_id': post_id,
                        'media_path': image_path,
                        'media_type': 'image',
                        'order_index': index,
                        'created_at': datetime.utcnow()
                    }
                    db.collection('Post_Media').add(media_data)
                    print(f"Created media entry for post {post_id}: {image_path}")
            
            print(f"Created new post {post_id} for user {user_id} with {len(image_paths)} images")
            return jsonify({'success': True, 'post_id': post_id, 'message': 'Post created successfully'})
            
        except Exception as e:
            print(f"Error creating post: {e}")
            return jsonify({'error': str(e)}), 500

@app.route('/posts/<post_id>', methods=['PUT', 'DELETE'])
def manage_post(post_id):
    """Update or delete a post"""
    print(f"🔧 manage_post called with method: {request.method}, post_id: {post_id}")
    try:
        if db is None:
            print("❌ Database not initialized")
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Check if post exists
        post_ref = db.collection('Posts').document(post_id)
        post_doc = post_ref.get()
        
        if not post_doc.exists:
            print(f"❌ Post {post_id} not found")
            return jsonify({'error': 'Post not found'}), 404
        
        post_data = post_doc.to_dict()
        print(f"✅ Post {post_id} found, proceeding with {request.method}")
        
        if request.method == 'PUT':
            # Update post
            data = request.get_json()
            content_text = data.get('content_text')
            updated_at = data.get('updated_at')
            
            if not content_text:
                return jsonify({'error': 'content_text is required'}), 400
            
            # Update the post
            update_data = {
                'content_text': content_text,
                'updated_at': datetime.utcnow()
            }
            
            post_ref.update(update_data)
            print(f"Updated post {post_id} with new content")
            
            return jsonify({
                'success': True, 
                'message': 'Post updated successfully',
                'updated_at': update_data['updated_at'].isoformat()
            })
            
        elif request.method == 'DELETE':
            print(f"🗑️ DELETE request received for post {post_id}")
            
            # Delete post and all related data
            # Delete post media
            media_docs = db.collection('Post_Media').where('post_id', '==', post_id).stream()
            media_count = 0
            for media_doc in media_docs:
                media_doc.reference.delete()
                media_count += 1
            print(f"🗑️ Deleted {media_count} media items for post {post_id}")
            
            # Delete post likes
            likes_doc = db.collection('Post_Likes').document(post_id)
            if likes_doc.get().exists:
                likes_doc.delete()
                print(f"🗑️ Deleted likes for post {post_id}")
            else:
                print(f"🗑️ No likes document found for post {post_id}")
            
            # Delete post comments
            comments_docs = db.collection('Post_Comments').where('post_id', '==', post_id).stream()
            comment_count = 0
            for comment_doc in comments_docs:
                comment_doc.reference.delete()
                comment_count += 1
            print(f"🗑️ Deleted {comment_count} comments for post {post_id}")
            
            # Delete the post itself
            post_ref.delete()
            print(f"🗑️ Deleted post {post_id} and all related data")
            
            return jsonify({'success': True, 'message': 'Post deleted successfully'})
            
    except Exception as e:
        print(f"Error managing post {post_id}: {e}")
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
                'birthdate': user_data.get('birthdate'),
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
            required_fields = ['firstName', 'lastName', 'birthdate', 'profileCompleted']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            # Validate birthdate
            try:
                birthdate = data['birthdate']
                if not birthdate:
                    return jsonify({'error': 'Birthdate is required'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Birthdate must be a valid date'}), 400
            
            # Get user document
            user_doc = db.collection('User_collection').document(user_id).get()
            
            if user_doc.exists:
                # Update existing user document
                update_data = {
                    'firstName': data['firstName'],
                    'lastName': data['lastName'],
                    'birthdate': birthdate,
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
                    'birthdate': birthdate,
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


@app.route('/test-upload', methods=['GET', 'POST'])
def test_upload():
    """Test endpoint to verify upload functionality"""
    if request.method == 'GET':
        return jsonify({'message': 'Upload test endpoint is working', 'method': 'GET'})
    else:
        return jsonify({
            'message': 'Upload test endpoint is working', 
            'method': 'POST',
            'files': list(request.files.keys()),
            'form': list(request.form.keys())
        })

@app.route('/upload/post-image', methods=['POST'])
def upload_post_image():
    """Upload an image for a post"""
    try:
        print(f"POST /upload/post-image - Request method: {request.method}")
        print(f"Request files: {list(request.files.keys())}")
        print(f"Request form: {list(request.form.keys())}")
        
        # Check if file is present in request
        if 'image' not in request.files:
            print("Error: No 'image' field in request.files")
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        print(f"File received: {file.filename}, Content type: {file.content_type}")
        
        # Check if file is selected
        if file.filename == '':
            print("Error: Empty filename")
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
        filename = generate_unique_post_filename(file.filename)
        file_path = os.path.join(POST_IMAGES_FOLDER, filename)
        print(f"Saving file to: {file_path}")
        
        # Save file
        file.save(file_path)
        print(f"File saved successfully: {filename}")
        
        # Process image (resize, optimize)
        if not process_post_image(file_path):
            # Clean up file if processing failed
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': 'Failed to process image'}), 500
        
        # Generate URL for the image
        image_url = f"/uploads/posts/{filename}"
        
        print(f"Post image uploaded successfully: {filename}")
        print(f"Image URL: {image_url}")
        
        return jsonify({
            'success': True,
            'message': 'Post image uploaded successfully',
            'imageUrl': image_url,
            'imagePath': image_url
        })
        
    except Exception as e:
        print(f"Error uploading post image: {e}")
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


@app.route('/quests/reset', methods=['POST'])
def reset_all_quests():
    """Delete all existing quests and generate new ones with updated types"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json() or {}
        quests_to_generate = data.get('quests_to_generate', 20)  # Number of new quests to generate
        
        # Step 1: Delete all existing quests
        print("🗑️ Deleting all existing quests...")
        quests_ref = db.collection('Quests').stream()
        deleted_count = 0
        
        for quest_doc in quests_ref:
            quest_doc.reference.delete()
            deleted_count += 1
        
        print(f"✅ Deleted {deleted_count} existing quests")
        
        # Step 2: Generate new quests with updated types
        print(f"🎯 Generating {quests_to_generate} new quests with updated types...")
        generated_quests = generate_quests_with_gemini(quests_to_generate)
        
        if not generated_quests:
            return jsonify({'error': 'Failed to generate new quests'}), 500
        
        # Step 3: Insert new quests into database
        inserted_count = 0
        for quest_data in generated_quests:
            try:
                quest_ref = db.collection('Quests').document()
                quest_data['id'] = quest_ref.id
                quest_data['created_at'] = datetime.utcnow()
                quest_data['updated_at'] = datetime.utcnow()
                quest_ref.set(quest_data)
                inserted_count += 1
                print(f"✅ Inserted quest: {quest_data['title']} (Type: {quest_data['type']})")
            except Exception as e:
                print(f"❌ Error inserting quest: {e}")
        
        return jsonify({
            'success': True,
            'message': f'Successfully reset quests! Deleted {deleted_count} old quests and generated {inserted_count} new quests.',
            'deleted_count': deleted_count,
            'generated_count': inserted_count,
            'quests': generated_quests[:10]  # Return first 10 for preview
        })
        
    except Exception as e:
        print(f"❌ Error resetting quests: {e}")
        return jsonify({'error': str(e)}), 500


def generate_quests_with_gemini(count=10):
    """Generate quest content using Gemini API"""
    try:
        # Quest categories and their characteristics
        categories = [
            {
                'name': 'scanning',
                'icon': 'camera-alt',
                'description': 'Camera-based material identification and scanning',
                'types': ['scan_material', 'identify_item', 'categorize_waste', 'discover_material']
            },
            {
                'name': 'community',
                'icon': 'people',
                'description': 'Social sharing and community engagement',
                'types': ['share_tip', 'post_project', 'comment_help', 'like_content', 'share_achievement']
            },
            {
                'name': 'recycling',
                'icon': 'recycling',
                'description': 'Recycling projects and material management',
                'types': ['start_project', 'complete_project', 'add_material', 'track_progress']
            },
            {
                'name': 'profile',
                'icon': 'person',
                'description': 'Profile setup and personalization',
                'types': ['complete_profile', 'add_photo', 'update_info', 'verify_account']
            },
            {
                'name': 'location',
                'icon': 'place',
                'description': 'Location-based environmental awareness',
                'types': ['share_location', 'climate_awareness', 'local_recycling', 'environmental_tips']
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
            if quest_data['points'] < 12:
                quest_data['points'] = 12
            elif quest_data['points'] > 150:
                quest_data['points'] = 150
        except (ValueError, TypeError):
            quest_data['points'] = random.choice([12, 25, 50, 75, 100, 150])
        
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
        'scan_material': {
            'title': f"Scan {random.choice([5, 10, 15, 20])} Materials",
            'description': f"Use the camera to scan and identify {random.choice([5, 10, 15, 20])} different materials for recycling.",
            'points': random.choice([25, 50, 75]),
            'target_count': random.choice([5, 10, 15, 20])
        },
        'identify_item': {
            'title': f"Identify {random.choice([3, 5, 8])} Waste Items",
            'description': f"Successfully identify and categorize {random.choice([3, 5, 8])} different waste items.",
            'points': random.choice([37, 62, 87]),
            'target_count': random.choice([3, 5, 8])
        },
        'categorize_waste': {
            'title': f"Categorize {random.choice([10, 15, 25])} Items",
            'description': f"Properly categorize {random.choice([10, 15, 25])} waste items by material type.",
            'points': random.choice([50, 75, 100]),
            'target_count': random.choice([10, 15, 25])
        },
        'discover_material': {
            'title': f"Discover {random.choice([5, 10])} New Materials",
            'description': f"Scan and discover {random.choice([5, 10])} new materials you haven't seen before.",
            'points': random.choice([37, 75]),
            'target_count': random.choice([5, 10])
        },
        'share_tip': {
            'title': f"Share {random.choice([3, 5])} Recycling Tips",
            'description': f"Share {random.choice([3, 5])} helpful recycling tips with the community.",
            'points': random.choice([37, 62]),
            'target_count': random.choice([3, 5])
        },
        'post_project': {
            'title': f"Post {random.choice([2, 3, 5])} Recycling Projects",
            'description': f"Share {random.choice([2, 3, 5])} of your recycling projects with the community.",
            'points': random.choice([50, 75, 100]),
            'target_count': random.choice([2, 3, 5])
        },
        'comment_help': {
            'title': f"Help {random.choice([5, 10, 15])} Community Members",
            'description': f"Leave helpful comments on {random.choice([5, 10, 15])} community posts.",
            'points': random.choice([25, 50, 75]),
            'target_count': random.choice([5, 10, 15])
        },
        'like_content': {
            'title': f"Engage with {random.choice([10, 20, 30])} Posts",
            'description': f"Like and engage with {random.choice([10, 20, 30])} community posts.",
            'points': random.choice([12, 25, 37]),
            'target_count': random.choice([10, 20, 30])
        },
        'share_achievement': {
            'title': f"Share {random.choice([2, 3])} Achievements",
            'description': f"Share {random.choice([2, 3])} of your recycling achievements with the community.",
            'points': random.choice([37, 62]),
            'target_count': random.choice([2, 3])
        },
        'start_project': {
            'title': f"Start {random.choice([2, 3, 5])} Recycling Projects",
            'description': f"Begin {random.choice([2, 3, 5])} new recycling projects in the app.",
            'points': random.choice([50, 75, 100]),
            'target_count': random.choice([2, 3, 5])
        },
        'complete_project': {
            'title': f"Complete {random.choice([1, 2, 3])} Recycling Projects",
            'description': f"Successfully complete {random.choice([1, 2, 3])} recycling projects.",
            'points': random.choice([75, 125, 175]),
            'target_count': random.choice([1, 2, 3])
        },
        'add_material': {
            'title': f"Add {random.choice([5, 10, 15])} Materials to Projects",
            'description': f"Add {random.choice([5, 10, 15])} different materials to your recycling projects.",
            'points': random.choice([37, 62, 87]),
            'target_count': random.choice([5, 10, 15])
        },
        'track_progress': {
            'title': f"Track Progress on {random.choice([3, 5, 7])} Projects",
            'description': f"Update and track progress on {random.choice([3, 5, 7])} active recycling projects.",
            'points': random.choice([25, 50, 75]),
            'target_count': random.choice([3, 5, 7])
        },
        'complete_profile': {
            'title': "Complete Your Profile",
            'description': "Fill out all sections of your user profile including personal information.",
            'points': 50,
            'target_count': 1
        },
        'add_photo': {
            'title': "Add Profile Photo",
            'description': "Upload a profile photo to personalize your account.",
            'points': 25,
            'target_count': 1
        },
        'update_info': {
            'title': f"Update Profile {random.choice([2, 3])} Times",
            'description': f"Keep your profile information current by updating it {random.choice([2, 3])} times.",
            'points': random.choice([12, 25]),
            'target_count': random.choice([2, 3])
        },
        'verify_account': {
            'title': "Verify Your Account",
            'description': "Complete account verification to unlock all features.",
            'points': 37,
            'target_count': 1
        },
        'share_location': {
            'title': "Share Your Location",
            'description': "Enable location sharing to get personalized environmental tips.",
            'points': 25,
            'target_count': 1
        },
        'climate_awareness': {
            'title': f"Check Climate Data {random.choice([5, 10])} Times",
            'description': f"View your local climate information {random.choice([5, 10])} times to stay informed.",
            'points': random.choice([12, 25]),
            'target_count': random.choice([5, 10])
        },
        'local_recycling': {
            'title': f"Discover {random.choice([3, 5])} Local Recycling Options",
            'description': f"Find and explore {random.choice([3, 5])} local recycling facilities or programs.",
            'points': random.choice([37, 62]),
            'target_count': random.choice([3, 5])
        },
        'environmental_tips': {
            'title': f"Read {random.choice([5, 10, 15])} Environmental Tips",
            'description': f"Read and learn from {random.choice([5, 10, 15])} environmental tips and articles.",
            'points': random.choice([12, 25, 37]),
            'target_count': random.choice([5, 10, 15])
        }
    }
    
    template = fallback_templates.get(quest_type, fallback_templates['scan_material'])
    
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


@app.route('/quests/delete-all', methods=['DELETE'])
def delete_all_quests():
    """Delete all existing quests from the database"""
    try:
        if db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # Get all quests (active and inactive)
        quests_ref = db.collection('Quests').stream()
        deleted_count = 0
        
        for quest_doc in quests_ref:
            quest_doc.reference.delete()
            deleted_count += 1
        
        print(f"Deleted {deleted_count} quests from database")
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} quests',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        print(f"Error deleting quests: {e}")
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
                
                # Debug logging
                print(f"Quest {quest_id}: current_progress={current_progress}, new_progress={new_progress}, target_count={target_count}, is_completed={is_completed}, points_earned={points_earned}")
                
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
                    'quest_title': quest_data.get('title', 'Quest'),
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
                
                # Debug logging for new quest progress
                print(f"New quest {quest_id}: new_progress={new_progress}, target_count={target_count}, is_completed={is_completed}, points_earned={points_earned}")
                
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
                    'quest_title': quest_data.get('title', 'Quest'),
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
        
        # Get level based on points (reduced by half)
        if total_points < 50:
            level = 'Eco Beginner'
        elif total_points < 150:
            level = 'Eco Explorer'
        elif total_points < 300:
            level = 'Eco Warrior'
        elif total_points < 500:
            level = 'Eco Champion'
        elif total_points < 750:
            level = 'Eco Master'
        else:
            level = 'Eco Legend'
        
        level_progress = (total_points % 250) / 250 * 100
        
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

@app.route('/uploads/posts/<filename>')
def serve_post_image(filename):
    """Serve post images as static files"""
    try:
        from flask import send_from_directory
        return send_from_directory(POST_IMAGES_FOLDER, filename)
    except Exception as e:
        print(f"Error serving post image {filename}: {e}")
        return jsonify({'error': 'Image not found'}), 404


# =============================================================================
# DISPOSAL API ENDPOINTS
# =============================================================================

@app.route('/disposal/check', methods=['POST'])
def check_disposal_method():
    """Check if disposal method exists in database"""
    try:
        data = request.get_json()
        material_name = data.get('material_name')
        climate_classification = data.get('climate_classification')
        climate_location = data.get('climate_location')
        
        print(f"[Disposal API] 🔍 Checking disposal method for:")
        print(f"  Material: {material_name}")
        print(f"  Climate: {climate_classification}")
        print(f"  Location: {climate_location}")
        
        if not all([material_name, climate_classification, climate_location]):
            print(f"[Disposal API] ❌ Missing required fields:")
            print(f"  material_name: {bool(material_name)}")
            print(f"  climate_classification: {bool(climate_classification)}")
            print(f"  climate_location: {bool(climate_location)}")
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Query the disposal collection
        disposal_ref = db.collection('Disposal')
        query = disposal_ref.where('material_name', '==', material_name)\
                           .where('climate_classification', '==', climate_classification)\
                           .where('climate_location', '==', climate_location)
        
        print(f"[Disposal API] 🔎 Executing Firestore query...")
        docs = query.get()
        print(f"[Disposal API] 📊 Query returned {len(docs)} documents")
        
        if docs:
            disposal_data = docs[0].to_dict()
            disposal_data['id'] = docs[0].id
            print(f"[Disposal API] ✅ Found existing disposal method:")
            print(f"  ID: {docs[0].id}")
            print(f"  Material: {disposal_data.get('material_name', 'Unknown')}")
            print(f"  Climate: {disposal_data.get('climate_classification', 'Unknown')}")
            print(f"  Location: {disposal_data.get('climate_location', 'Unknown')}")
            print(f"  Steps count: {len(disposal_data.get('disposal_steps', []))}")
            print(f"  Created: {disposal_data.get('created_at', 'Unknown')}")
            print(f"  Updated: {disposal_data.get('updated_at', 'Unknown')}")
            return jsonify({
                'found': True,
                'disposal_data': disposal_data
            })
        else:
            print(f"[Disposal API] ❌ No disposal method found in database")
            print(f"[Disposal API] 💡 Consider generating new disposal method for this material/climate combination")
            return jsonify({
                'found': False,
                'message': 'No disposal method found'
            })
            
    except Exception as e:
        print(f"[Disposal API] Error checking disposal method: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/disposal/generate', methods=['POST'])
def generate_disposal_steps():
    """Generate disposal steps using AI"""
    try:
        data = request.get_json()
        material_name = data.get('material_name')
        climate_classification = data.get('climate_classification')
        climate_location = data.get('climate_location')
        temperature = data.get('temperature')
        humidity = data.get('humidity')
        precipitation = data.get('precipitation')
        recycling_guidelines = data.get('recycling_guidelines', {})
        disposal_tips = data.get('disposal_tips', [])
        
        print(f"[Disposal API] 🤖 Generating AI disposal steps for:")
        print(f"  Material: {material_name}")
        print(f"  Climate: {climate_classification}")
        print(f"  Location: {climate_location}")
        print(f"  Temperature: {temperature}°C")
        print(f"  Humidity: {humidity}%")
        print(f"  Precipitation: {precipitation}mm")
        print(f"  Composting Available: {recycling_guidelines.get('composting', False)}")
        print(f"  Acceptable Plastics: {', '.join(recycling_guidelines.get('plasticRecycling', []))}")
        print(f"  Disposal Tips Count: {len(disposal_tips)}")
        
        if not all([material_name, climate_classification, climate_location]):
            print(f"[Disposal API] ❌ Missing required fields:")
            print(f"  material_name: {bool(material_name)}")
            print(f"  climate_classification: {bool(climate_classification)}")
            print(f"  climate_location: {bool(climate_location)}")
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create AI prompt for disposal steps
        prompt = f"""
        Generate detailed disposal steps for the material "{material_name}" in a {climate_classification} climate.
        
        Climate Conditions:
        - Classification: {climate_classification}
        - Location: {climate_location}
        - Temperature: {temperature}°C
        - Humidity: {humidity}%
        - Precipitation: {precipitation}mm
        
        Recycling Guidelines:
        - Composting Available: {recycling_guidelines.get('composting', False)}
        - Acceptable Plastics: {', '.join(recycling_guidelines.get('plasticRecycling', []))}
        - Hazardous Waste Types: {', '.join(recycling_guidelines.get('hazardousWaste', []))}
        - Seasonal Considerations: {', '.join(recycling_guidelines.get('seasonalConsiderations', []))}
        
        Climate-Specific Tips: {', '.join(disposal_tips)}
        
        Please provide 5-8 specific, actionable disposal steps that consider:
        1. The material type and its properties
        2. The climate conditions and their impact on disposal
        3. Environmental best practices
        4. Safety considerations
        5. Local recycling capabilities
        
        Format the response as a JSON array of strings, where each string is a clear, numbered step.
        Example: ["1. Check if the material is recyclable in your area", "2. Clean the material thoroughly", ...]
        """
        
        # Call AI service (you'll need to implement this based on your AI provider)
        print(f"[Disposal API] 📝 Created AI prompt (length: {len(prompt)} characters)")
        print(f"[Disposal API] 🧠 Calling AI to generate disposal steps...")
        
        disposal_steps = generate_ai_disposal_steps(prompt)
        
        print(f"[Disposal API] ✅ AI generated {len(disposal_steps)} disposal steps")
        if disposal_steps and len(disposal_steps) > 0:
            print(f"[Disposal API] 📋 First step: {disposal_steps[0]}")
            print(f"[Disposal API] 📋 Last step: {disposal_steps[-1]}")
        else:
            print(f"[Disposal API] ⚠️ No disposal steps generated")
        
        return jsonify({
            'success': True,
            'disposal_steps': disposal_steps,
            'material_name': material_name,
            'climate_classification': climate_classification,
            'climate_location': climate_location
        })
        
    except Exception as e:
        print(f"[Disposal API] Error generating disposal steps: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/disposal/save', methods=['POST'])
def save_disposal_method():
    """Save disposal method to database"""
    try:
        data = request.get_json()
        
        print(f"[Disposal API] 💾 Saving disposal method:")
        print(f"  Material: {data.get('material_name')}")
        print(f"  Climate: {data.get('climate_classification')}")
        print(f"  Location: {data.get('climate_location')}")
        print(f"  Steps count: {len(data.get('disposal_steps', []))}")
        
        # Validate required fields
        required_fields = ['material_name', 'climate_classification', 'climate_location', 'disposal_steps']
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"[Disposal API] ❌ Missing required fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400
        
        # Add timestamp
        timestamp = datetime.now().isoformat()
        data['created_at'] = timestamp
        data['updated_at'] = timestamp
        print(f"[Disposal API] 📅 Added timestamps: {timestamp}")
        
        # Save to Firestore
        print(f"[Disposal API] 🔥 Saving to Firestore Disposal collection...")
        disposal_ref = db.collection('Disposal')
        doc_ref = disposal_ref.add(data)
        
        print(f"[Disposal API] ✅ Successfully saved disposal method:")
        print(f"  Document ID: {doc_ref[1].id}")
        print(f"  Material: {data.get('material_name')}")
        print(f"  Climate: {data.get('climate_classification')}")
        print(f"  Steps: {len(data.get('disposal_steps', []))}")
        
        return jsonify({
            'success': True,
            'id': doc_ref[1].id,
            'message': 'Disposal method saved successfully'
        })
        
    except Exception as e:
        print(f"[Disposal API] Error saving disposal method: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/disposal/material/<material_name>', methods=['GET'])
def get_disposal_methods_for_material(material_name):
    """Get all disposal methods for a specific material"""
    try:
        print(f"[Disposal API] Getting disposal methods for material: {material_name}")
        
        disposal_ref = db.collection('Disposal')
        query = disposal_ref.where('material_name', '==', material_name)
        docs = query.get()
        
        disposal_methods = []
        for doc in docs:
            disposal_data = doc.to_dict()
            disposal_data['id'] = doc.id
            disposal_methods.append(disposal_data)
        
        print(f"[Disposal API] Found {len(disposal_methods)} disposal methods for {material_name}")
        
        return jsonify({
            'success': True,
            'disposal_methods': disposal_methods
        })
        
    except Exception as e:
        print(f"[Disposal API] Error getting disposal methods for material: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/disposal/climate/<climate_classification>', methods=['GET'])
def get_disposal_methods_for_climate(climate_classification):
    """Get all disposal methods for a specific climate classification"""
    try:
        print(f"[Disposal API] Getting disposal methods for climate: {climate_classification}")
        
        disposal_ref = db.collection('Disposal')
        query = disposal_ref.where('climate_classification', '==', climate_classification)
        docs = query.get()
        
        disposal_methods = []
        for doc in docs:
            disposal_data = doc.to_dict()
            disposal_data['id'] = doc.id
            disposal_methods.append(disposal_data)
        
        print(f"[Disposal API] Found {len(disposal_methods)} disposal methods for {climate_classification}")
        
        return jsonify({
            'success': True,
            'disposal_methods': disposal_methods
        })
        
    except Exception as e:
        print(f"[Disposal API] Error getting disposal methods for climate: {e}")
        return jsonify({'error': str(e)}), 500

def generate_ai_disposal_steps(prompt):
    """Generate disposal steps using Gemini AI"""
    try:
        if not gemini_initialized:
            print("[Gemini] API not initialized, using fallback")
            return generate_fallback_steps(prompt)
        
        print(f"[Gemini] Generating disposal steps with prompt length: {len(prompt)}")
        
        # Generate content using the correct API
        response = genai.generate_text(
            model='models/text-bison-001',
            prompt=prompt,
            temperature=0.7,
            max_output_tokens=1024
        )
        
        if response and response.result:
            print(f"[Gemini] Generated response: {len(response.result)} characters")
            
            # Parse the response to extract disposal steps
            disposal_steps = parse_gemini_response(response.result)
            
            if disposal_steps:
                print(f"[Gemini] Successfully parsed {len(disposal_steps)} disposal steps")
                return disposal_steps
            else:
                print("[Gemini] Failed to parse response, using fallback")
                return generate_fallback_steps(prompt)
        else:
            print("[Gemini] No response text received, using fallback")
            return generate_fallback_steps(prompt)
            
    except Exception as e:
        print(f"[Gemini] Error generating disposal steps: {e}")
        return generate_fallback_steps(prompt)

def parse_gemini_response(response_text):
    """Parse Gemini response to extract disposal steps"""
    try:
        # Try to parse as JSON first
        if response_text.strip().startswith('[') and response_text.strip().endswith(']'):
            import json
            steps = json.loads(response_text.strip())
            if isinstance(steps, list):
                return steps
        
        # If not JSON, try to extract numbered steps
        lines = response_text.split('\n')
        steps = []
        
        for line in lines:
            line = line.strip()
            # Look for numbered steps (1., 2., etc.)
            if line and (line[0].isdigit() or line.startswith('•') or line.startswith('-') or line.startswith('*')):
                # Clean up the line
                if line[0].isdigit():
                    # Remove number prefix
                    step = line.split('.', 1)[1].strip() if '.' in line else line
                else:
                    # Remove bullet point
                    step = line[1:].strip()
                
                if step:
                    steps.append(step)
        
        # If we found steps, return them
        if steps:
            return steps
        
        # If no numbered steps found, split by sentences
        sentences = response_text.split('.')
        steps = []
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 10:  # Filter out very short sentences
                steps.append(sentence + '.')
        
        return steps[:8]  # Limit to 8 steps
        
    except Exception as e:
        print(f"[Gemini] Error parsing response: {e}")
        return None

def generate_fallback_steps(prompt):
    """Generate fallback disposal steps when Gemini fails"""
    material_name = prompt.split('"')[1] if '"' in prompt else "material"
    climate = "temperate" if "temperate" in prompt.lower() else "tropical"
    
    example_steps = [
        f"1. Identify the type of {material_name} and check for any hazardous components",
        f"2. Clean the {material_name} thoroughly to remove any contaminants",
        f"3. Check local recycling guidelines for {material_name} in your area",
        f"4. Separate any recyclable parts from non-recyclable components",
        f"5. Store the {material_name} in appropriate containers based on climate conditions",
        f"6. Contact local waste management for proper disposal instructions",
        f"7. Consider upcycling or repurposing the {material_name} if possible",
        f"8. Document the disposal process for future reference"
    ]
    
    return example_steps

@app.route('/materials/unique', methods=['GET'])
def get_unique_materials():
    """Get all unique material names from Materials collection"""
    try:
        print("[Materials API] Getting unique materials from Materials collection...")
        
        # Get all materials directly from Materials collection
        materials_ref = db.collection('Materials')
        materials = materials_ref.get()
        
        unique_materials = set()
        
        for material_doc in materials:
            try:
                material_data = material_doc.to_dict()
                material_name = material_data.get('Name', '')
                if material_name:
                    unique_materials.add(material_name)
            except Exception as e:
                print(f"[Materials API] Error processing material {material_doc.id}: {e}")
                continue
        
        unique_materials_list = list(unique_materials)
        print(f"[Materials API] Found {len(unique_materials_list)} unique materials")
        
        return jsonify({
            'success': True,
            'materials': unique_materials_list,
            'count': len(unique_materials_list)
        })
        
    except Exception as e:
        print(f"[Materials API] Error getting unique materials: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/disposal/populate-tropical', methods=['POST'])
def populate_tropical_disposal():
    """Populate disposal table for all unique materials in tropical climate"""
    try:
        print("[Disposal API] Starting tropical disposal table population...")
        
        # Get all unique materials directly from Materials collection
        materials_ref = db.collection('Materials')
        materials = materials_ref.get()
        
        unique_materials = set()
        
        for material_doc in materials:
            try:
                material_data = material_doc.to_dict()
                material_name = material_data.get('Name', '')
                if material_name:
                    unique_materials.add(material_name)
            except Exception as e:
                print(f"[Disposal API] Error processing material {material_doc.id}: {e}")
                continue
        
        unique_materials_list = list(unique_materials)
        print(f"[Disposal API] Found {len(unique_materials_list)} unique materials to process")
        
        # Check existing tropical disposal entries
        disposal_ref = db.collection('Disposal')
        existing_query = disposal_ref.where('climate_classification', '==', 'Tropical')
        existing_docs = existing_query.get()
        existing_materials = set()
        
        for doc in existing_docs:
            disposal_data = doc.to_dict()
            existing_materials.add(disposal_data.get('material_name', ''))
        
        # Filter out materials that already have tropical disposal entries
        materials_to_process = [m for m in unique_materials_list if m not in existing_materials]
        
        print(f"[Disposal API] Processing {len(materials_to_process)} new materials (skipping {len(existing_materials)} existing)")
        
        results = {
            'processed': len(materials_to_process),
            'successful': 0,
            'failed': 0,
            'errors': [],
            'skipped': len(existing_materials)
        }
        
        # Process each material
        for material_name in materials_to_process:
            try:
                # Generate disposal steps for tropical climate
                disposal_steps = generate_tropical_disposal_steps(material_name)
                
                # Create disposal entry
                disposal_data = {
                    'climate_classification': 'Tropical',
                    'climate_location': '0,0',  # Generic tropical location
                    'material_name': material_name,
                    'disposal_steps': disposal_steps,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # Save to database
                disposal_ref.add(disposal_data)
                results['successful'] += 1
                print(f"[Disposal API] ✅ Created disposal entry for: {material_name}")
                
            except Exception as e:
                results['failed'] += 1
                error_msg = f"Error processing {material_name}: {str(e)}"
                results['errors'].append(error_msg)
                print(f"[Disposal API] ❌ {error_msg}")
        
        print(f"[Disposal API] Population complete: {results}")
        
        return jsonify({
            'success': True,
            'message': 'Tropical disposal table population completed',
            'results': results
        })
        
    except Exception as e:
        print(f"[Disposal API] Error in population process: {e}")
        return jsonify({'error': str(e)}), 500

def generate_tropical_disposal_steps(material_name):
    """Generate disposal steps for tropical climate using Gemini AI"""
    try:
        if not gemini_initialized:
            print("[Gemini] API not initialized for tropical steps, using fallback")
            return generate_tropical_fallback_steps(material_name)
        
        # Create a specific prompt for tropical climate disposal
        prompt = f"""
        Generate detailed disposal steps for the material "{material_name}" in a Tropical climate.
        
        Climate Conditions:
        - Classification: Tropical
        - Temperature: 28°C average (22-35°C range)
        - Humidity: 75%
        - Precipitation: 150mm
        - Location: Tropical region
        
        Tropical Climate Considerations:
        - High humidity and heat year-round
        - Rainy seasons affect collection schedules
        - Rapid decomposition of organic materials
        - Mold and bacterial growth concerns
        - Pest issues with organic waste
        - Heat-sensitive material storage needs
        
        Recycling Guidelines for Tropical Climate:
        - Composting Available: Yes
        - Acceptable Plastics: PET, HDPE, PP, LDPE, PS, PVC
        - Hazardous Waste Types: Batteries, Electronics, Chemicals, Paint, Pesticides, Pool chemicals
        - Seasonal Considerations: Year-round composting, High humidity storage, Rainy season considerations
        
        Please provide 6-8 specific, actionable disposal steps that consider:
        1. The material type and its properties
        2. Tropical climate conditions (high humidity, heat, rainy seasons)
        3. Environmental best practices for tropical regions
        4. Safety considerations in hot, humid conditions
        5. Local recycling capabilities in tropical areas
        6. Storage requirements to prevent mold, pests, and degradation
        
        Format the response as a JSON array of strings, where each string is a clear, numbered step.
        Example: ["1. Check if the material is recyclable in your area", "2. Clean the material thoroughly", ...]
        """
        
        print(f"[Gemini] Generating tropical disposal steps for: {material_name}")
        
        # Generate content using the correct API
        response = genai.generate_text(
            model='models/text-bison-001',
            prompt=prompt,
            temperature=0.7,
            max_output_tokens=1024
        )
        
        if response and response.result:
            print(f"[Gemini] Generated tropical response: {len(response.result)} characters")
            
            # Parse the response to extract disposal steps
            disposal_steps = parse_gemini_response(response.result)
            
            if disposal_steps:
                print(f"[Gemini] Successfully parsed {len(disposal_steps)} tropical disposal steps")
                return disposal_steps
            else:
                print("[Gemini] Failed to parse tropical response, using fallback")
                return generate_tropical_fallback_steps(material_name)
        else:
            print("[Gemini] No tropical response text received, using fallback")
            return generate_tropical_fallback_steps(material_name)
            
    except Exception as e:
        print(f"[Gemini] Error generating tropical disposal steps: {e}")
        return generate_tropical_fallback_steps(material_name)

def generate_tropical_fallback_steps(material_name):
    """Generate fallback tropical disposal steps when Gemini fails"""
    base_steps = [
        f"1. Identify the type of {material_name} and check for any hazardous components",
        f"2. Clean the {material_name} thoroughly to remove any contaminants",
        f"3. Check local recycling guidelines for {material_name} in tropical climate conditions",
        f"4. Separate any recyclable parts from non-recyclable components",
        f"5. Store the {material_name} in airtight containers to prevent humidity damage",
        f"6. Consider the rainy season schedule for waste collection",
        f"7. Contact local waste management for proper disposal instructions",
        f"8. Consider upcycling or repurposing the {material_name} if possible"
    ]
    
    # Add climate-specific steps based on material type
    material_lower = material_name.lower()
    
    if 'plastic' in material_lower or 'bottle' in material_lower or 'container' in material_lower:
        base_steps.insert(5, f"5a. Rinse plastic containers thoroughly to prevent bacterial growth in high humidity")
        base_steps.insert(6, f"5b. Dry completely before storage to prevent mold formation")
    
    if 'paper' in material_lower or 'cardboard' in material_lower:
        base_steps.insert(5, f"5a. Store paper products in dry, well-ventilated areas")
        base_steps.insert(6, f"5b. Use moisture-absorbing packets if available")
    
    if 'organic' in material_lower or 'food' in material_lower or 'compost' in material_lower:
        base_steps.insert(5, f"5a. Use airtight composting containers to prevent pests")
        base_steps.insert(6, f"5b. Turn compost regularly due to rapid decomposition in tropical heat")
    
    if 'electronic' in material_lower or 'battery' in material_lower:
        base_steps.insert(5, f"5a. Store electronics in cool, dry places away from direct sunlight")
        base_steps.insert(6, f"5b. Remove batteries before disposal to prevent corrosion")
    
    return base_steps

# Educational Content Functions

def query_educational_content(material_name, db):
    """Query educational content from the Educational table for a specific material"""
    try:
        print(f"[Educational Content] Querying database for material: '{material_name}'")
        
        if not db:
            print("[Educational Content] ❌ Database not available")
            return None
            
        # Query the Educational collection for content about this material
        educational_docs = db.collection('Educational').where('material_name', '==', material_name).limit(1).stream()
        
        for doc in educational_docs:
            data = doc.to_dict()
            print(f"[Educational Content] ✅ Found educational content for '{material_name}': {data.get('title', 'No title')}")
            return {
                'id': doc.id,
                'material_name': data.get('material_name', ''),
                'title': data.get('title', ''),
                'content': data.get('content', ''),
                'fun_fact': data.get('fun_fact', ''),
                'recycling_tip': data.get('recycling_tip', ''),
                'environmental_impact': data.get('environmental_impact', ''),
                'created_at': data.get('created_at', ''),
                'updated_at': data.get('updated_at', '')
            }
        
        print(f"[Educational Content] ❌ No educational content found for '{material_name}'")
        return None
        
    except Exception as e:
        print(f"[Educational Content] ❌ Error querying educational content: {e}")
        return None

def generate_educational_content_with_gemini(material_name):
    """Generate educational content about a material using Gemini API"""
    try:
        print(f"[Educational Content] Generating content with Gemini for material: '{material_name}'")
        
        if not gemini_initialized:
            print("[Educational Content] ❌ Gemini API not initialized")
            return None
        
        
        # Create a comprehensive prompt for educational content
        prompt = f"""
        Generate educational content about recycling and environmental impact for the material: "{material_name}".
        
        Please provide a comprehensive educational piece that includes:
        1. A catchy title (max 60 characters)
        2. Main educational content (2-3 paragraphs, informative but engaging)
        3. A fun fact about the material (1-2 sentences)
        4. A practical recycling tip (1-2 sentences)
        5. Environmental impact information (1-2 sentences about benefits of recycling this material)
        
        IMPORTANT: Return ONLY a valid JSON object with these exact keys (no markdown, no code blocks, no extra text):
        - title: string
        - content: string
        - fun_fact: string
        - recycling_tip: string
        - environmental_impact: string
        
        Make the content engaging, educational, and encouraging for users to recycle. Use a friendly, informative tone.
        """
        
        # Generate content using existing Gemini API structure
        print(f"[Educational Content] 🔍 Calling Gemini API with prompt: {prompt[:200]}...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt]
        )
        
        print(f"[Educational Content] 🔍 Raw Gemini response: {response}")
        print(f"[Educational Content] 🔍 Response text: {response.text if response else 'No response'}")
        
        if response and response.text:
            # Parse the JSON response
            import json
            import re
            try:
                raw_text = response.text.strip()
                print(f"[Educational Content] 🔍 Raw response text: {raw_text}")
                
                # Try to extract JSON from markdown code blocks
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
                if json_match:
                    json_text = json_match.group(1)
                    print(f"[Educational Content] 🔍 Extracted JSON from code block: {json_text}")
                else:
                    # Try to find JSON object directly
                    json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
                    if json_match:
                        json_text = json_match.group(0)
                        print(f"[Educational Content] 🔍 Found JSON object: {json_text}")
                    else:
                        json_text = raw_text
                        print(f"[Educational Content] 🔍 Using raw text as JSON: {json_text}")
                
                content_data = json.loads(json_text)
                
                # Validate required fields
                required_fields = ['title', 'content', 'fun_fact', 'recycling_tip', 'environmental_impact']
                for field in required_fields:
                    if field not in content_data:
                        content_data[field] = f"Information about {material_name} recycling"
                
                print(f"[Educational Content] ✅ Generated content for '{material_name}': {content_data.get('title', 'No title')}")
                print(f"[Educational Content] 📊 Full content data: {content_data}")
                return content_data
                
            except json.JSONDecodeError as e:
                print(f"[Educational Content] ❌ Failed to parse Gemini response as JSON: {e}")
                print(f"[Educational Content] Raw response: {response.text}")
                return None
        else:
            print("[Educational Content] ❌ No response from Gemini API")
            return None
            
    except Exception as e:
        print(f"[Educational Content] ❌ Error generating content with Gemini: {e}")
        return None

def save_educational_content_to_db(material_name, content_data, db):
    """Save generated educational content to the Educational table"""
    try:
        print(f"[Educational Content] Saving content to database for material: '{material_name}'")
        
        if not db:
            print("[Educational Content] ❌ Database not available")
            return None
            
        # Prepare data for database
        educational_data = {
            'material_name': material_name,
            'title': content_data.get('title', ''),
            'content': content_data.get('content', ''),
            'fun_fact': content_data.get('fun_fact', ''),
            'recycling_tip': content_data.get('recycling_tip', ''),
            'environmental_impact': content_data.get('environmental_impact', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Save to Educational collection
        doc_ref = db.collection('Educational').add(educational_data)
        doc_id = doc_ref[1].id
        
        print(f"[Educational Content] ✅ Saved educational content to database with ID: {doc_id}")
        return {
            'id': doc_id,
            **educational_data
        }
        
    except Exception as e:
        print(f"[Educational Content] ❌ Error saving content to database: {e}")
        return None

@app.route('/educational-content/<material_name>', methods=['GET'])
def get_educational_content(material_name):
    """Get or generate educational content for a material"""
    try:
        print(f"[Educational Content API] Request for material: '{material_name}'")
        
        # First, try to get existing content from database
        existing_content = query_educational_content(material_name, db)
        
        if existing_content:
            print(f"[Educational Content API] ✅ Returning existing content for '{material_name}'")
            return jsonify({
                'success': True,
                'content': existing_content,
                'source': 'database'
            })
        
        # If no existing content, generate new content
        print(f"[Educational Content API] No existing content found, generating new content for '{material_name}'")
        generated_content = generate_educational_content_with_gemini(material_name)
        
        if generated_content:
            # Save the generated content to database
            saved_content = save_educational_content_to_db(material_name, generated_content, db)
            
            if saved_content:
                print(f"[Educational Content API] ✅ Generated and saved new content for '{material_name}'")
                return jsonify({
                    'success': True,
                    'content': saved_content,
                    'source': 'generated'
                })
            else:
                print(f"[Educational Content API] ❌ Failed to save generated content for '{material_name}'")
                return jsonify({
                    'success': False,
                    'error': 'Failed to save generated content'
                }), 500
        else:
            print(f"[Educational Content API] ❌ Failed to generate content for '{material_name}'")
            return jsonify({
                'success': False,
                'error': 'Failed to generate educational content'
            }), 500
            
    except Exception as e:
        print(f"[Educational Content API] ❌ Error in get_educational_content: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload-project-photo', methods=['POST'])
def upload_project_photo():
    """Upload a photo for a completed project"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        project_id = data.get('project_id')
        user_id = data.get('user_id')
        image_data = data.get('image_data')  # Base64 encoded image
        
        if not all([project_id, user_id, image_data]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        print(f"[Project Photo] Uploading photo for project: {project_id}, user: {user_id}")
        
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Generate unique filename
            filename = f"project_{project_id}_{uuid.uuid4().hex[:8]}.jpg"
            
            # Upload to Hostinger (you'll need to configure your Hostinger FTP details)
            # For now, we'll save locally and return a URL
            upload_path = f"uploads/project_photos/{filename}"
            os.makedirs(os.path.dirname(upload_path), exist_ok=True)
            
            # Convert to RGB and save as JPEG
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image.save(upload_path, 'JPEG', quality=85)
            
            # In production, upload to Hostinger here
            # For now, return local path
            photo_url = f"http://127.0.0.1:5000/{upload_path}"
            
            # Update project in database with photo URL
            if db:
                project_ref = db.collection('projects').document(project_id)
                project_ref.update({
                    'photo_url': photo_url,
                    'photo_uploaded_at': datetime.now().isoformat()
                })
                
                print(f"[Project Photo] ✅ Photo uploaded successfully: {photo_url}")
                
                return jsonify({
                    'success': True,
                    'photo_url': photo_url,
                    'message': 'Photo uploaded successfully'
                })
            else:
                return jsonify({'success': False, 'error': 'Database not available'}), 500
                
        except Exception as e:
            print(f"[Project Photo] ❌ Error processing image: {e}")
            return jsonify({'success': False, 'error': 'Invalid image data'}), 400
            
    except Exception as e:
        print(f"[Project Photo] ❌ Error in upload_project_photo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/uploads/project_photos/<filename>')
def serve_project_photo(filename):
    """Serve uploaded project photos"""
    try:
        photo_path = f"uploads/project_photos/{filename}"
        if os.path.exists(photo_path):
            return send_file(photo_path, mimetype='image/jpeg')
        else:
            return jsonify({'error': 'Photo not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Listen on all interfaces so the mobile device / emulator can reach it.
    app.run(host='0.0.0.0', port=5000, debug=True)