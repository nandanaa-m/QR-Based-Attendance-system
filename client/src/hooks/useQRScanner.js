import { useState, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Custom hook for QR code scanning
 */
export const useQRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);

  /**
   * Start QR scanner
   */
  const startScanner = useCallback(async (elementId, onSuccess) => {
    try {
      setError(null);
      setResult(null);

      // Create scanner instance
      scannerRef.current = new Html5Qrcode(elementId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      };

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Success callback
          setResult(decodedText);
          setScanning(false);
          
          // Stop scanner after successful scan
          if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
          }
          
          // Call external success handler
          if (onSuccess) {
            try {
              const parsed = JSON.parse(decodedText);
              onSuccess(parsed);
            } catch {
              onSuccess(decodedText);
            }
          }
        },
        (errorMessage) => {
          // Error callback (called frequently during scanning)
          // Only log critical errors, not "no QR found" messages
          if (!errorMessage.includes('No QR code found')) {
            console.debug('QR scan:', errorMessage);
          }
        }
      );

      setScanning(true);
    } catch (err) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
    }
  }, []);

  /**
   * Stop QR scanner
   */
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  }, [scanning]);

  /**
   * Reset scanner state
   */
  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setScanning(false);
  }, []);

  return {
    scanning,
    error,
    result,
    startScanner,
    stopScanner,
    reset
  };
};

export default useQRScanner;

