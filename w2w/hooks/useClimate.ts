import { useState, useEffect } from 'react';
import { LocationData, getClimateData, ClimateData } from '@/lib/climateService';

export interface UseClimateReturn {
  climateData: ClimateData | null;
  loading: boolean;
  error: string | null;
  getClimateForLocation: (location: LocationData) => Promise<void>;
  refreshClimateData: () => Promise<void>;
}

export function useClimate(): UseClimateReturn {
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClimateForLocation = async (location: LocationData): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const data = await getClimateData(location);
      setClimateData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get climate data';
      setError(errorMessage);
      console.error('Climate data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshClimateData = async (): Promise<void> => {
    if (climateData) {
      // We would need the original location to refresh
      // For now, just clear the data
      setClimateData(null);
      setError(null);
    }
  };

  return {
    climateData,
    loading,
    error,
    getClimateForLocation,
    refreshClimateData,
  };
}
