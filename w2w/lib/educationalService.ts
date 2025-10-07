import { API_BASE_URL } from './config';

export interface EducationalContent {
  id: string;
  material_name: string;
  title: string;
  content: string;
  fun_fact: string;
  recycling_tip: string;
  environmental_impact: string;
  created_at: string;
  updated_at: string;
}

export interface EducationalContentResponse {
  success: boolean;
  content: EducationalContent | null;
  source: 'database' | 'generated';
  error?: string;
}

class EducationalService {
  private baseUrl: string;

  constructor() {
  this.baseUrl = API_BASE_URL;
  }

  /**
   * Fetch educational content for a material
   * First tries to get from database, then generates new content if not found
   */
  async getEducationalContent(materialName: string): Promise<EducationalContentResponse> {
    try {
      console.log(`[Educational Service] Fetching educational content for: ${materialName}`);
      
      const response = await fetch(`${this.baseUrl}/educational-content/${encodeURIComponent(materialName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`[Educational Service] API error: ${response.status}`, errorData);
        return {
          success: false,
          content: null,
          source: 'database',
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      console.log(`[Educational Service] ✅ Content fetched successfully from ${data.source}`);
      
      return {
        success: true,
        content: data.content,
        source: data.source,
      };

    } catch (error) {
      console.error('[Educational Service] ❌ Error fetching educational content:', error);
      return {
        success: false,
        content: null,
        source: 'database',
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Check if educational content exists for a material (without fetching full content)
   */
  async hasEducationalContent(materialName: string): Promise<boolean> {
    try {
      const response = await this.getEducationalContent(materialName);
      return response.success && response.content !== null;
    } catch (error) {
      console.error('[Educational Service] Error checking educational content:', error);
      return false;
    }
  }

  /**
   * Generate educational content for a material (force generation)
   */
  async generateEducationalContent(materialName: string): Promise<EducationalContentResponse> {
    try {
      console.log(`[Educational Service] Generating new educational content for: ${materialName}`);
      
      // First, try to get existing content
      const existingResponse = await this.getEducationalContent(materialName);
      
      if (existingResponse.success && existingResponse.content) {
        console.log('[Educational Service] Content already exists, returning existing content');
        return existingResponse;
      }

      // If no existing content, the API will automatically generate new content
      console.log('[Educational Service] No existing content found, API will generate new content');
      return existingResponse; // The API handles generation automatically

    } catch (error) {
      console.error('[Educational Service] ❌ Error generating educational content:', error);
      return {
        success: false,
        content: null,
        source: 'generated',
        error: error instanceof Error ? error.message : 'Generation error',
      };
    }
  }
}

// Export singleton instance
export const educationalService = new EducationalService();
