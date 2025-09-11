import { ClimateData } from './climateService';
import { DisposalData, saveDisposalMethod } from './disposalService';

const API_BASE_URL = 'http://127.0.0.1:5000';

// Tropical climate data for disposal generation
const TROPICAL_CLIMATE_DATA: ClimateData = {
  climateZone: 'Tropical',
  temperature: {
    average: 28,
    min: 22,
    max: 35,
    unit: 'C'
  },
  humidity: 75,
  precipitation: 150,
  recyclingGuidelines: {
    composting: true,
    plasticRecycling: ['PET', 'HDPE', 'PP', 'LDPE', 'PS', 'PVC'],
    hazardousWaste: ['Batteries', 'Electronics', 'Chemicals', 'Paint', 'Pesticides', 'Pool chemicals'],
    seasonalConsiderations: ['Year-round composting', 'High humidity storage', 'Rainy season considerations']
  },
  disposalTips: [
    'High humidity requires careful storage',
    'Rainy season may affect collection schedules',
    'Rapid decomposition of organic materials',
    'Use airtight containers for food waste composting',
    'Store paper products in dry areas to prevent mold',
    'Heat-sensitive materials need special storage'
  ]
};

// Generate disposal steps for tropical climate
const generateTropicalDisposalSteps = (materialName: string): string[] => {
  const baseSteps = [
    `1. Identify the type of ${materialName} and check for any hazardous components`,
    `2. Clean the ${materialName} thoroughly to remove any contaminants`,
    `3. Check local recycling guidelines for ${materialName} in tropical climate conditions`,
    `4. Separate any recyclable parts from non-recyclable components`,
    `5. Store the ${materialName} in airtight containers to prevent humidity damage`,
    `6. Consider the rainy season schedule for waste collection`,
    `7. Contact local waste management for proper disposal instructions`,
    `8. Consider upcycling or repurposing the ${materialName} if possible`
  ];

  // Add climate-specific steps based on material type
  const materialLower = materialName.toLowerCase();
  
  if (materialLower.includes('plastic') || materialLower.includes('bottle') || materialLower.includes('container')) {
    baseSteps.splice(5, 0, `5a. Rinse plastic containers thoroughly to prevent bacterial growth in high humidity`);
    baseSteps.splice(6, 0, `5b. Dry completely before storage to prevent mold formation`);
  }
  
  if (materialLower.includes('paper') || materialLower.includes('cardboard')) {
    baseSteps.splice(5, 0, `5a. Store paper products in dry, well-ventilated areas`);
    baseSteps.splice(6, 0, `5b. Use moisture-absorbing packets if available`);
  }
  
  if (materialLower.includes('organic') || materialLower.includes('food') || materialLower.includes('compost')) {
    baseSteps.splice(5, 0, `5a. Use airtight composting containers to prevent pests`);
    baseSteps.splice(6, 0, `5b. Turn compost regularly due to rapid decomposition in tropical heat`);
  }
  
  if (materialLower.includes('electronic') || materialLower.includes('battery')) {
    baseSteps.splice(5, 0, `5a. Store electronics in cool, dry places away from direct sunlight`);
    baseSteps.splice(6, 0, `5b. Remove batteries before disposal to prevent corrosion`);
  }

  return baseSteps;
};

// Get unique materials from all users
export const getUniqueMaterials = async (): Promise<string[]> => {
  try {
    console.log('[Populate Disposal] Fetching unique materials from all users...');
    
    const response = await fetch(`${API_BASE_URL}/materials/unique`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[Populate Disposal] Found ${data.materials.length} unique materials`);
    
    return data.materials || [];
  } catch (error) {
    console.error('[Populate Disposal] Error fetching unique materials:', error);
    throw error;
  }
};

// Create disposal entry for a material in tropical climate
export const createTropicalDisposalEntry = async (materialName: string): Promise<boolean> => {
  try {
    console.log(`[Populate Disposal] Creating tropical disposal entry for: ${materialName}`);
    
    const disposalSteps = generateTropicalDisposalSteps(materialName);
    
    const disposalData: DisposalData = {
      climate_classification: 'Tropical',
      climate_location: '0,0', // Generic tropical location
      material_name: materialName,
      disposal_steps: disposalSteps,
    };
    
    const saved = await saveDisposalMethod(disposalData);
    
    if (saved) {
      console.log(`[Populate Disposal] Successfully created disposal entry for ${materialName}`);
      return true;
    } else {
      console.error(`[Populate Disposal] Failed to save disposal entry for ${materialName}`);
      return false;
    }
  } catch (error) {
    console.error(`[Populate Disposal] Error creating disposal entry for ${materialName}:`, error);
    return false;
  }
};

// Populate disposal table for all unique materials in tropical climate
export const populateTropicalDisposalTable = async (): Promise<{
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> => {
  try {
    console.log('[Populate Disposal] Starting tropical disposal table population...');
    
    const uniqueMaterials = await getUniqueMaterials();
    const results = {
      success: true,
      processed: uniqueMaterials.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    console.log(`[Populate Disposal] Processing ${uniqueMaterials.length} unique materials...`);
    
    for (const materialName of uniqueMaterials) {
      try {
        const success = await createTropicalDisposalEntry(materialName);
        if (success) {
          results.successful++;
          console.log(`[Populate Disposal] ✅ Success: ${materialName}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to save disposal entry for ${materialName}`);
          console.log(`[Populate Disposal] ❌ Failed: ${materialName}`);
        }
        
        // Add small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.failed++;
        const errorMessage = `Error processing ${materialName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMessage);
        console.error(`[Populate Disposal] ❌ Error: ${materialName} - ${errorMessage}`);
      }
    }
    
    console.log(`[Populate Disposal] Population complete:`, {
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      errorCount: results.errors.length
    });
    
    return results;
  } catch (error) {
    console.error('[Populate Disposal] Error in population process:', error);
    return {
      success: false,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Check if disposal entries already exist for tropical climate
export const checkTropicalDisposalEntries = async (): Promise<{
  existing: number;
  missing: string[];
  existingMaterials: string[];
}> => {
  try {
    console.log('[Populate Disposal] Checking existing tropical disposal entries...');
    
    const response = await fetch(`${API_BASE_URL}/disposal/climate/Tropical`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const existingEntries = data.disposal_methods || [];
    const existingMaterials = existingEntries.map((entry: DisposalData) => entry.material_name);
    
    const uniqueMaterials = await getUniqueMaterials();
    const missingMaterials = uniqueMaterials.filter(material => !existingMaterials.includes(material));
    
    console.log(`[Populate Disposal] Check results:`, {
      existing: existingEntries.length,
      missing: missingMaterials.length,
      totalUnique: uniqueMaterials.length
    });
    
    return {
      existing: existingEntries.length,
      missing: missingMaterials,
      existingMaterials
    };
  } catch (error) {
    console.error('[Populate Disposal] Error checking disposal entries:', error);
    return {
      existing: 0,
      missing: [],
      existingMaterials: []
    };
  }
};
