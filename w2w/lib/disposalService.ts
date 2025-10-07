import { ClimateData } from './climateService';

export interface DisposalData {
  id?: string;
  climate_classification: string;
  climate_location: string;
  material_name: string;
  disposal_steps: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DisposalRequest {
  materialName: string;
  climateData: ClimateData;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface DisposalResponse {
  found: boolean;
  disposalData?: DisposalData;
  aiGenerated?: boolean;
  message?: string;
}

import { API_BASE_URL } from './config';

// Check if disposal method exists in database
export const checkDisposalMethod = async (
  materialName: string,
  climateClassification: string,
  climateLocation: string
): Promise<DisposalData | null> => {
  try {
    console.log(`[Disposal Service] Checking disposal method for:`, {
      materialName,
      climateClassification,
      climateLocation
    });

    const response = await fetch(`${API_BASE_URL}/disposal/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        material_name: materialName,
        climate_classification: climateClassification,
        climate_location: climateLocation,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Disposal Service] Database response:`, data);

    if (data.found && data.disposal_data) {
      return data.disposal_data;
    }

    return null;
  } catch (error) {
    console.error('[Disposal Service] Error checking disposal method:', error);
    return null;
  }
};

// Generate disposal steps using AI
export const generateDisposalSteps = async (
  materialName: string,
  climateData: ClimateData,
  location: { latitude: number; longitude: number }
): Promise<string[]> => {
  try {
    console.log(`[Disposal Service] Generating AI disposal steps for:`, {
      materialName,
      climateZone: climateData.climateZone,
      temperature: climateData.temperature.average,
      humidity: climateData.humidity
    });

    const response = await fetch(`${API_BASE_URL}/disposal/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        material_name: materialName,
        climate_classification: climateData.climateZone,
        climate_location: `${location.latitude},${location.longitude}`,
        temperature: climateData.temperature.average,
        humidity: climateData.humidity,
        precipitation: climateData.precipitation,
        recycling_guidelines: climateData.recyclingGuidelines,
        disposal_tips: climateData.disposalTips,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Disposal Service] AI generated steps:`, data);

    if (data.disposal_steps && Array.isArray(data.disposal_steps)) {
      return data.disposal_steps;
    }

    throw new Error('Invalid response format from AI service');
  } catch (error) {
    console.error('[Disposal Service] Error generating disposal steps:', error);
    throw error;
  }
};

// Save disposal method to database
export const saveDisposalMethod = async (disposalData: DisposalData): Promise<boolean> => {
  try {
    console.log(`[Disposal Service] Saving disposal method:`, disposalData);

    const response = await fetch(`${API_BASE_URL}/disposal/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disposalData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Disposal Service] Save response:`, data);

    return data.success === true;
  } catch (error) {
    console.error('[Disposal Service] Error saving disposal method:', error);
    return false;
  }
};

// Main function to get disposal method (check database first, then generate with AI if not found)
export const getDisposalMethod = async (request: DisposalRequest): Promise<DisposalResponse> => {
  try {
    const { materialName, climateData, location } = request;
    
    console.log(`[Disposal Service] Getting disposal method for:`, {
      materialName,
      climateZone: climateData.climateZone,
      location: `${location.latitude},${location.longitude}`
    });

    // First, check if disposal method exists in database
    const existingDisposal = await checkDisposalMethod(
      materialName,
      climateData.climateZone,
      `${location.latitude},${location.longitude}`
    );

    if (existingDisposal) {
      console.log(`[Disposal Service] Found existing disposal method in database`);
      return {
        found: true,
        disposalData: existingDisposal,
        aiGenerated: false,
        message: 'Disposal method found in database'
      };
    }

    // If not found, generate with AI
    console.log(`[Disposal Service] No existing method found, generating with AI`);
    const aiGeneratedSteps = await generateDisposalSteps(materialName, climateData, location);

    const newDisposalData: DisposalData = {
      climate_classification: climateData.climateZone,
      climate_location: `${location.latitude},${location.longitude}`,
      material_name: materialName,
      disposal_steps: aiGeneratedSteps,
    };

    // Save the AI-generated disposal method to database
    const saved = await saveDisposalMethod(newDisposalData);
    
    if (saved) {
      console.log(`[Disposal Service] Successfully saved AI-generated disposal method`);
      return {
        found: true,
        disposalData: newDisposalData,
        aiGenerated: true,
        message: 'Disposal method generated with AI and saved to database'
      };
    } else {
      console.log(`[Disposal Service] Failed to save disposal method, but returning AI-generated steps`);
      return {
        found: true,
        disposalData: newDisposalData,
        aiGenerated: true,
        message: 'Disposal method generated with AI (failed to save to database)'
      };
    }
  } catch (error) {
    console.error('[Disposal Service] Error getting disposal method:', error);
    return {
      found: false,
      message: error instanceof Error ? error.message : 'Failed to get disposal method'
    };
  }
};

// Get disposal methods for a specific material across different climates
export const getDisposalMethodsForMaterial = async (materialName: string): Promise<DisposalData[]> => {
  try {
    console.log(`[Disposal Service] Getting all disposal methods for material:`, materialName);

    const response = await fetch(`${API_BASE_URL}/disposal/material/${encodeURIComponent(materialName)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Disposal Service] Material disposal methods:`, data);

    return data.disposal_methods || [];
  } catch (error) {
    console.error('[Disposal Service] Error getting disposal methods for material:', error);
    return [];
  }
};

// Get disposal methods for a specific climate classification
export const getDisposalMethodsForClimate = async (climateClassification: string): Promise<DisposalData[]> => {
  try {
    console.log(`[Disposal Service] Getting disposal methods for climate:`, climateClassification);

    const response = await fetch(`${API_BASE_URL}/disposal/climate/${encodeURIComponent(climateClassification)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Disposal Service] Climate disposal methods:`, data);

    return data.disposal_methods || [];
  } catch (error) {
    console.error('[Disposal Service] Error getting disposal methods for climate:', error);
    return [];
  }
};
