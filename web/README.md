# 🌐 Web Folder - Image Upload System

This folder contains all web-related files for the image upload functionality of the Waste to Worth app.

## 📁 File Structure

```
web/
├── upload_image.php          # General image upload handler
├── user_profile_image.php    # User-specific profile image API
├── list_images.php          # List all uploaded images
├── test_upload.html         # Test page for image uploads
├── gallery.html             # Gallery to view uploaded images
├── uploads/                 # Image storage directory
│   └── profile_images/      # Profile images storage
└── README.md               # This file
```

## 🚀 API Endpoints

### Profile Image API
- **POST** `/user/{userId}/profile-image` - Upload profile image
- **GET** `/user/{userId}/profile-image` - Get profile image URL
- **DELETE** `/user/{userId}/profile-image` - Delete profile image

### General Upload API
- **POST** `/upload_image.php` - Upload any image
- **GET** `/list_images.php` - List all uploaded images

## 🔧 Configuration

### Hosting URL
All files are configured to work with: `https://red-goat-592690.hostingersite.com`

### Image Processing
- **Max File Size**: 5MB
- **Allowed Types**: JPEG, PNG, GIF, WEBP
- **Output Size**: 400x400px (square)
- **Quality**: 85% JPEG compression

## 📱 React Native Integration

The React Native app uses these endpoints through the `ImageService` class:

```typescript
import { ImageService } from '@/lib/imageService';

// Upload image
const response = await ImageService.uploadProfileImage(userId, imageUri);

// Get profile image
const response = await ImageService.getProfileImage(userId);
```

## 🧪 Testing

### Test Upload Page
Visit: `https://red-goat-592690.hostingersite.com/web/test_upload.html`

### Image Gallery
Visit: `https://red-goat-592690.hostingersite.com/web/gallery.html`

## 🛡️ Security Features

- File type validation (whitelist approach)
- File size limits
- Filename sanitization
- CORS headers for cross-origin requests
- User ID validation
- Error handling and cleanup

## 📊 File Storage

Images are stored in: `web/uploads/profile_images/`
- Filename format: `{userId}_{timestamp}.jpg`
- Automatic cleanup of failed uploads
- Database consistency checks

## 🔄 Usage Flow

1. **Upload**: User selects image → PHP processes and stores → Returns URL
2. **Display**: App requests image URL → PHP returns URL → App displays image
3. **Delete**: App requests deletion → PHP removes file and database reference

## 🚨 Troubleshooting

- **Upload fails**: Check file size and type
- **Image not displaying**: Verify URL and file existence
- **CORS errors**: Ensure proper headers are set
- **Permission errors**: Check directory write permissions

## 📝 Notes

- All images are automatically converted to JPEG for consistency
- Images are resized and cropped to square format
- Unique filenames prevent conflicts
- Database references are cleaned up automatically
