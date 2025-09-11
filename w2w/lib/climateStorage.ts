import { ClimateData, getClimateData } from '@/lib/climateService';
import { LocationData } from '@/hooks/useLocation';

interface ClimateStorage {
  climateData: ClimateData | null;
  location: LocationData | null;
  lastUpdated: number | null;
  isLoading: boolean;
  error: string | null;
}

class ClimateStorageService {
  private storage: ClimateStorage = {
    climateData: null,
    location: null,
    lastUpdated: null,
    isLoading: false,
    error: null
  };

  private listeners: Set<() => void> = new Set();

  // Subscribe to climate data changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of changes
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Get current climate data
  getClimateData(): ClimateData | null {
    return this.storage.climateData;
  }

  // Get current location
  getLocation(): LocationData | null {
    return this.storage.location;
  }

  // Get loading state
  isLoading(): boolean {
    return this.storage.isLoading;
  }

  // Get error state
  getError(): string | null {
    return this.storage.error;
  }

  // Check if climate data is fresh (less than 1 hour old)
  isDataFresh(): boolean {
    if (!this.storage.lastUpdated) return false;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return Date.now() - this.storage.lastUpdated < oneHour;
  }

  // Fetch and store climate data for a location
  async fetchAndStoreClimateData(location: LocationData): Promise<void> {
    console.log('[Climate Storage] 🔍 Starting climate data fetch process...');
    console.log('[Climate Storage] 📍 Location provided:', location);
    console.log('[Climate Storage] 📊 Current storage state:', {
      hasClimateData: !!this.storage.climateData,
      hasLocation: !!this.storage.location,
      isDataFresh: this.isDataFresh(),
      lastUpdated: this.storage.lastUpdated,
      isLoading: this.storage.isLoading,
      error: this.storage.error
    });

    // If we already have fresh data for this location, don't fetch again
    if (this.storage.climateData && 
        this.storage.location && 
        this.isDataFresh() &&
        this.storage.location.latitude === location.latitude &&
        this.storage.location.longitude === location.longitude) {
      console.log('[Climate Storage] ♻️ Using cached climate data (fresh)');
      return;
    }

    console.log('[Climate Storage] 🌡️ Fetching new climate data for location:', location);
    
    this.storage.isLoading = true;
    this.storage.error = null;
    this.notify();

    try {
      console.log('[Climate Storage] 📞 Calling getClimateData...');
      const climateData = await getClimateData(location);
      console.log('[Climate Storage] 📥 Received climate data:', climateData);
      
      this.storage.climateData = climateData;
      this.storage.location = location;
      this.storage.lastUpdated = Date.now();
      this.storage.error = null;
      
      console.log('[Climate Storage] ✅ Climate data stored successfully:', {
        climateZone: climateData.climateZone,
        temperature: climateData.temperature.average,
        humidity: climateData.humidity,
        location: `${location.latitude},${location.longitude}`,
        timestamp: new Date(this.storage.lastUpdated).toISOString()
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch climate data';
      this.storage.error = errorMessage;
      console.error('[Climate Storage] ❌ Error fetching climate data:', error);
      console.error('[Climate Storage] 🔍 Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      this.storage.isLoading = false;
      this.notify();
      console.log('[Climate Storage] 🏁 Climate data fetch process completed');
    }
  }

  // Clear stored climate data
  clearClimateData(): void {
    console.log('[Climate Storage] 🗑️ Clearing stored climate data');
    this.storage = {
      climateData: null,
      location: null,
      lastUpdated: null,
      isLoading: false,
      error: null
    };
    this.notify();
  }

  // Get storage status for debugging
  getStorageStatus(): ClimateStorage & { isDataFresh: boolean } {
    return {
      ...this.storage,
      isDataFresh: this.isDataFresh()
    };
  }
}

// Create singleton instance
export const climateStorage = new ClimateStorageService();

// Export types
export type { ClimateStorage };
