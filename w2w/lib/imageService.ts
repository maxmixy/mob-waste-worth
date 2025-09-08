// Image service for handling profile image uploads
import { Platform } from 'react-native';

const IMAGE_API_BASE_URL = 'https://red-goat-592690.hostingersite.com';

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  imageUrl?: string;
  error?: string;
}

export interface ImageGetResponse {
  success: boolean;
  hasImage: boolean;
  imageUrl?: string;
  updatedAt?: string;
  message?: string;
  error?: string;
}

export interface PostImageUploadResponse {
  success: boolean;
  message: string;
  imageUrl?: string;
  imagePath?: string;
  filename?: string;
  error?: string;
}

export class ImageService {
  /**
   * Upload a profile image for a user
   */
  static async uploadProfileImage(userId: string, imageUri: string): Promise<ImageUploadResponse> {
    try {
      console.log('📤 Starting image upload for user:', userId);
      console.log('📤 Image URI:', imageUri);
      console.log('📤 Platform:', Platform.OS);
      
      // Create FormData
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For web, we need to convert the URI to a File object
        console.log('🌐 Web platform detected, converting image URI to File');
        
        try {
          // Check if it's already a blob URL or data URL
          if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
            console.log('📤 Image URI is blob/data URL, fetching as blob');
            const response = await fetch(imageUri);
            const blob = await response.blob();
            
            // Create a File object from the blob
            const file = new File([blob], `profile_${userId}_${Date.now()}.jpg`, {
              type: blob.type || 'image/jpeg',
            });
            
            formData.append('image', file);
            console.log('✅ File object created from blob URL');
          } else {
            // For file:// URLs or other URIs, try to fetch them
            console.log('📤 Image URI is file/other URL, fetching as blob');
            const response = await fetch(imageUri);
            const blob = await response.blob();
            
            const file = new File([blob], `profile_${userId}_${Date.now()}.jpg`, {
              type: blob.type || 'image/jpeg',
            });
            
            formData.append('image', file);
            console.log('✅ File object created from file URL');
          }
        } catch (blobError) {
          console.error('❌ Error creating File object:', blobError);
          throw new Error('Failed to process image for web upload: ' + (blobError instanceof Error ? blobError.message : 'Unknown error'));
        }
      } else {
        // For mobile platforms, use the original approach
        console.log('📱 Mobile platform detected, using standard FormData');
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `profile_${userId}_${Date.now()}.jpg`,
        } as any);
      }

      console.log('📤 Making request to:', `${IMAGE_API_BASE_URL}/user/${userId}/profile-image`);
      
      // Make the request
      const response = await fetch(`${IMAGE_API_BASE_URL}/user/${userId}/profile-image`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with boundary
        ...(Platform.OS !== 'web' && {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      });

      console.log('📤 Response status:', response.status);
      console.log('📤 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('📤 Response data:', data);

      if (!response.ok) {
        console.log('❌ Upload failed with status:', response.status);
        return {
          success: false,
          message: 'Upload failed',
          error: data.error || 'Upload failed',
        };
      }

      console.log('✅ Upload successful!');
      return {
        success: true,
        message: data.message,
        imageUrl: data.imageUrl,
      };
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return {
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get user's profile image URL
   */
  static async getProfileImage(userId: string): Promise<ImageGetResponse> {
    try {
      const response = await fetch(`${IMAGE_API_BASE_URL}/user/${userId}/profile-image`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          hasImage: false,
          message: 'Failed to get image',
          error: data.error || 'Failed to get image',
        };
      }

      return {
        success: true,
        hasImage: data.hasImage,
        imageUrl: data.imageUrl,
        updatedAt: data.updatedAt,
        message: data.message,
      };
    } catch (error) {
      console.error('Error getting profile image:', error);
      return {
        success: false,
        hasImage: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Delete user's profile image
   */
  static async deleteProfileImage(userId: string): Promise<ImageUploadResponse> {
    try {
      const response = await fetch(`${IMAGE_API_BASE_URL}/user/${userId}/profile-image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: 'Delete failed',
          error: data.error || 'Delete failed',
        };
      }

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error('Error deleting profile image:', error);
      return {
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Upload a post image to Hostinger
   */
  static async uploadPostImage(imageUri: string): Promise<PostImageUploadResponse> {
    try {
      console.log('Uploading post image to Hostinger:', imageUri);
      
      const formData = new FormData();
      
      // Handle different platforms for FormData
      if (Platform.OS === 'web') {
        // For web, fetch the image as blob and create File object
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const file = new File([blob], 'post_image.jpg', { type: 'image/jpeg' });
        formData.append('image', file);
        console.log('Web: File object created for post image');
      } else {
        // For mobile, use the URI directly
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'post_image.jpg',
        } as any);
        console.log('Mobile: FormData created for post image');
      }
      
      const uploadResponse = await fetch(`${IMAGE_API_BASE_URL}/upload_post_image.php`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with boundary
      });
      
      console.log('Post image upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Post image upload failed:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const result = await uploadResponse.json();
      console.log('Post image upload result:', result);
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
          imageUrl: result.imageUrl,
          imagePath: result.imagePath,
          filename: result.filename,
        };
      } else {
        return {
          success: false,
          message: result.error || 'Upload failed',
          error: result.error,
        };
      }
    } catch (error) {
      console.error('Error uploading post image:', error);
      return {
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get the full image URL from a relative path
   */
  static getFullImageUrl(relativePath: string): string {
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    return `${IMAGE_API_BASE_URL}${relativePath}`;
  }
}
