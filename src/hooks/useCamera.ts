import type { PermissionState } from '@/types/geo';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';

export function useCamera() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissionState: PermissionState = !permission
    ? 'checking'
    : permission.granted
    ? 'granted'
    : !permission.canAskAgain
    ? 'blocked'
    : permission.status === 'undetermined'
    ? 'undetermined'
    : 'denied';

  const toggleFacing = useCallback(() => {
    setFacing((currentFacing: CameraType) => (currentFacing === 'back' ? 'front' : 'back'));
  }, []);

  const onCameraReady = useCallback(() => {
    setIsReady(true);
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !isReady || isCapturing) return null;
    setIsCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      return photo ?? null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al tomar la foto';
      setError(message);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isReady, isCapturing]);

  return {
    cameraRef,
    permissionState,
    requestPermission,
    openSettings,
    facing,
    toggleFacing,
    onCameraReady,
    takePhoto,
    isCapturing,
    error,
  };
}