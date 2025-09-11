import { useState } from 'react';
import { DisposalData, DisposalRequest, DisposalResponse, getDisposalMethod, getDisposalMethodsForMaterial, getDisposalMethodsForClimate } from '@/lib/disposalService';

export interface UseDisposalReturn {
  disposalData: DisposalData | null;
  loading: boolean;
  error: string | null;
  aiGenerated: boolean;
  getDisposalForMaterial: (request: DisposalRequest) => Promise<DisposalResponse>;
  getMaterialDisposalMethods: (materialName: string) => Promise<DisposalData[]>;
  getClimateDisposalMethods: (climateClassification: string) => Promise<DisposalData[]>;
  clearDisposalData: () => void;
}

export function useDisposal(): UseDisposalReturn {
  const [disposalData, setDisposalData] = useState<DisposalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);

  const getDisposalForMaterial = async (request: DisposalRequest): Promise<DisposalResponse> => {
    try {
      setLoading(true);
      setError(null);
      setAiGenerated(false);

      console.log('[UseDisposal] Getting disposal method for material:', request.materialName);

      const response = await getDisposalMethod(request);
      
      if (response.found && response.disposalData) {
        setDisposalData(response.disposalData);
        setAiGenerated(response.aiGenerated || false);
        console.log('[UseDisposal] Disposal method found:', {
          materialName: response.disposalData.material_name,
          climateClassification: response.disposalData.climate_classification,
          stepsCount: response.disposalData.disposal_steps.length,
          aiGenerated: response.aiGenerated
        });
      } else {
        setError(response.message || 'No disposal method found');
        console.log('[UseDisposal] No disposal method found:', response.message);
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get disposal method';
      setError(errorMessage);
      console.error('[UseDisposal] Error getting disposal method:', err);
      
      return {
        found: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const getMaterialDisposalMethods = async (materialName: string): Promise<DisposalData[]> => {
    try {
      setLoading(true);
      setError(null);

      console.log('[UseDisposal] Getting disposal methods for material:', materialName);
      const methods = await getDisposalMethodsForMaterial(materialName);
      
      console.log('[UseDisposal] Found disposal methods:', methods.length);
      return methods;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get disposal methods for material';
      setError(errorMessage);
      console.error('[UseDisposal] Error getting disposal methods for material:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getClimateDisposalMethods = async (climateClassification: string): Promise<DisposalData[]> => {
    try {
      setLoading(true);
      setError(null);

      console.log('[UseDisposal] Getting disposal methods for climate:', climateClassification);
      const methods = await getDisposalMethodsForClimate(climateClassification);
      
      console.log('[UseDisposal] Found disposal methods:', methods.length);
      return methods;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get disposal methods for climate';
      setError(errorMessage);
      console.error('[UseDisposal] Error getting disposal methods for climate:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const clearDisposalData = () => {
    setDisposalData(null);
    setError(null);
    setAiGenerated(false);
  };

  return {
    disposalData,
    loading,
    error,
    aiGenerated,
    getDisposalForMaterial,
    getMaterialDisposalMethods,
    getClimateDisposalMethods,
    clearDisposalData,
  };
}
