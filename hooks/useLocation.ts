import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationError {
  code: string;
  message: string;
}

export interface UseLocationReturn {
  location: LocationData | null;
  error: LocationError | null;
  loading: boolean;
  requestLocation: () => Promise<void>;
  getCurrentLocation: () => Promise<LocationData | null>;
}

// Web-specific location function using browser's geolocation API
const getWebLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === 'web') {
        // Use browser's native geolocation API for web
        const locationData = await getWebLocation();
        setLocation(locationData);
      } else {
        // Use expo-location for mobile platforms
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError({
            code: 'PERMISSION_DENIED',
            message: 'Permission to access location was denied'
          });
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy ?? undefined,
          altitude: currentLocation.coords.altitude ?? undefined,
          altitudeAccuracy: currentLocation.coords.altitudeAccuracy ?? undefined,
          heading: currentLocation.coords.heading ?? undefined,
          speed: currentLocation.coords.speed ?? undefined,
        });
      }
    } catch (err) {
      console.error('Location error:', err);
      setError({
        code: 'LOCATION_ERROR',
        message: err instanceof Error ? err.message : 'Failed to get location'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === 'web') {
        // Use browser's native geolocation API for web
        const locationData = await getWebLocation();
        setLocation(locationData);
        return locationData;
      } else {
        // Use expo-location for mobile platforms
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError({
            code: 'PERMISSION_DENIED',
            message: 'Location permission not granted'
          });
          return null;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const locationData: LocationData = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy ?? undefined,
          altitude: currentLocation.coords.altitude ?? undefined,
          altitudeAccuracy: currentLocation.coords.altitudeAccuracy ?? undefined,
          heading: currentLocation.coords.heading ?? undefined,
          speed: currentLocation.coords.speed ?? undefined,
        };

        setLocation(locationData);
        return locationData;
      }
    } catch (err) {
      console.error('Location error:', err);
      setError({
        code: 'LOCATION_ERROR',
        message: err instanceof Error ? err.message : 'Failed to get location'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    location,
    error,
    loading,
    requestLocation,
    getCurrentLocation,
  };
}
