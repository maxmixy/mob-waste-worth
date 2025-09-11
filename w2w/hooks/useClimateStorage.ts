import { useState, useEffect } from 'react';
import { climateStorage, ClimateStorage } from '@/lib/climateStorage';
import { ClimateData } from '@/lib/climateService';
import { LocationData } from '@/hooks/useLocation';

export interface UseClimateStorageReturn {
  climateData: ClimateData | null;
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  isDataFresh: boolean;
  fetchClimateData: (location: LocationData) => Promise<void>;
  clearClimateData: () => void;
  getStorageStatus: () => ClimateStorage & { isDataFresh: boolean };
}

export function useClimateStorage(): UseClimateStorageReturn {
  const [storage, setStorage] = useState<ClimateStorage & { isDataFresh: boolean }>(() => 
    climateStorage.getStorageStatus()
  );

  useEffect(() => {
    console.log('[useClimateStorage] 🔄 Setting up climate storage subscription');
    
    // Subscribe to climate storage changes
    const unsubscribe = climateStorage.subscribe(() => {
      const newStorage = climateStorage.getStorageStatus();
      console.log('[useClimateStorage] 📡 Storage changed, updating state:', newStorage);
      setStorage(newStorage);
    });

    // Get initial state
    const initialStorage = climateStorage.getStorageStatus();
    console.log('[useClimateStorage] 🏁 Initial storage state:', initialStorage);
    setStorage(initialStorage);

    return () => {
      console.log('[useClimateStorage] 🗑️ Cleaning up climate storage subscription');
      unsubscribe();
    };
  }, []);

  const fetchClimateData = async (location: LocationData): Promise<void> => {
    await climateStorage.fetchAndStoreClimateData(location);
  };

  const clearClimateData = (): void => {
    climateStorage.clearClimateData();
  };

  const getStorageStatus = (): ClimateStorage & { isDataFresh: boolean } => {
    return climateStorage.getStorageStatus();
  };

  return {
    climateData: storage.climateData,
    location: storage.location,
    loading: storage.isLoading,
    error: storage.error,
    isDataFresh: storage.isDataFresh,
    fetchClimateData,
    clearClimateData,
    getStorageStatus
  };
}
