import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useScanner = (readerId: string, onScan: (value: string) => void) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const [isActive, setIsActive] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopCamera = useCallback(async () => {
    if (!scannerRef.current || !isActive) return;
    await scannerRef.current.stop();
    await scannerRef.current.clear();
    setIsActive(false);
  }, [isActive]);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const scanner = scannerRef.current ?? new Html5Qrcode(readerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          setLastScan(decodedText);
          onScanRef.current(decodedText);
        },
        () => undefined,
      );
      setIsActive(true);
    } catch {
      setError('Camera access denied or camera not found.');
      setIsActive(false);
    }
  }, [readerId]);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().then(() => scannerRef.current?.clear());
      }
    };
  }, []);

  return { isActive, startCamera, stopCamera, lastScan, error };
};
