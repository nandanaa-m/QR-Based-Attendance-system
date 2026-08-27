import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling geolocation
 * Provides current location, loading state, and error handling
 */
export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options
  };

  /**
   * Get current position once
   */
  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error('Geolocation is not supported by your browser');
        setError(err.message);
        reject(err);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = 'Unable to get location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = err.message || 'Unknown error occurred';
          }
          
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, [defaultOptions]);

  /**
   * Watch position continuously
   */
  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return null;
    }

    setLoading(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      defaultOptions
    );

    return watchId;
  }, [defaultOptions]);

  /**
   * Clear watch
   */
  const clearWatch = useCallback((watchId) => {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setLocation(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    location,
    error,
    loading,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    reset,
    isSupported: !!navigator.geolocation
  };
};

export default useGeolocation;
