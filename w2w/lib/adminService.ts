const API_BASE_URL = 'http://127.0.0.1:5000';

export interface PopulationResult {
  success: boolean;
  message: string;
  results: {
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
    skipped: number;
  };
}

// Trigger the tropical disposal table population
export const populateTropicalDisposalTable = async (): Promise<PopulationResult> => {
  try {
    console.log('[Admin Service] Triggering tropical disposal table population...');
    
    const response = await fetch(`${API_BASE_URL}/disposal/populate-tropical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Admin Service] Population result:', data);

    return data;
  } catch (error) {
    console.error('[Admin Service] Error triggering population:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to trigger population',
      results: {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        skipped: 0
      }
    };
  }
};

// Get unique materials count
export const getUniqueMaterialsCount = async (): Promise<number> => {
  try {
    console.log('[Admin Service] Getting unique materials count...');
    
    const response = await fetch(`${API_BASE_URL}/materials/unique`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Admin Service] Unique materials count:', data.count);

    return data.count || 0;
  } catch (error) {
    console.error('[Admin Service] Error getting unique materials count:', error);
    return 0;
  }
};

// Check existing tropical disposal entries count
export const getTropicalDisposalCount = async (): Promise<number> => {
  try {
    console.log('[Admin Service] Getting tropical disposal entries count...');
    
    const response = await fetch(`${API_BASE_URL}/disposal/climate/Tropical`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const count = data.disposal_methods ? data.disposal_methods.length : 0;
    console.log('[Admin Service] Tropical disposal entries count:', count);

    return count;
  } catch (error) {
    console.error('[Admin Service] Error getting tropical disposal count:', error);
    return 0;
  }
};
