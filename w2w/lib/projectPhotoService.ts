import { API_BASE_URL } from './config';

export interface ProjectPhotoUploadResponse {
    success: boolean;
    photo_url?: string;
    message?: string;
    error?: string;
}

export const projectPhotoService = {
    uploadProjectPhoto: async (
        projectId: string,
        userId: string,
        imageData: string
    ): Promise<ProjectPhotoUploadResponse> => {
        try {
            console.log(`[Project Photo Service] Uploading photo for project: ${projectId}`);
            
            const response = await fetch(`${API_BASE_URL}/upload-project-photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_id: projectId,
                    user_id: userId,
                    image_data: imageData,
                }),
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log(`[Project Photo Service] ✅ Photo uploaded successfully: ${data.photo_url}`);
                return data;
            } else {
                console.log(`[Project Photo Service] ❌ Upload failed: ${data.error}`);
                return {
                    success: false,
                    error: data.error || 'Failed to upload photo'
                };
            }
        } catch (error) {
            console.error('[Project Photo Service] ❌ Error uploading photo:', error);
            return {
                success: false,
                error: 'Network error occurred'
            };
        }
    },
};
