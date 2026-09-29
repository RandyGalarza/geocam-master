import type { PermissionState } from '@/types/geo';
import {
    CameraView,
    useCameraPermissions,
    type CameraCapturedPicture,
    type CameraType,
    type CameraViewProps,
} from 'expo-camera';
import type { RefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';

type CameraPermissionRequest = ReturnType<typeof useCameraPermissions>[1];
type CameraPermissionResponse = Awaited<ReturnType<CameraPermissionRequest>>;
type CameraMountErrorHandler = NonNullable<CameraViewProps['onMountError']>;

export interface UseCameraResult {
  cameraRef: RefObject<CameraView | null>;
  permissionState: PermissionState;
  requestPermission: () => Promise<CameraPermissionResponse | null>;
  openSettings: () => void;
  facing: CameraType;
  toggleFacing: () => void;
  onCameraReady: () => void;
  onCameraUnavailable: () => void;
  onMountError: CameraMountErrorHandler;
  takePhoto: () => Promise<CameraCapturedPicture | null>;
  isReady: boolean;
  isCapturing: boolean;
  error: string | null;
}

export function useCamera(): UseCameraResult {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestCameraPermission] = useCameraPermissions();
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
    setIsReady(false);
    setFacing((currentFacing: CameraType) => (currentFacing === 'back' ? 'front' : 'back'));
  }, []);

  const onCameraReady = useCallback(() => {
    setIsReady(true);
    setError(null);
  }, []);

  const onCameraUnavailable = useCallback(() => {
    setIsReady(false);
  }, []);

  const onMountError = useCallback<CameraMountErrorHandler>((event) => {
    setIsReady(false);
    setError(event.message);
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'No se pudieron abrir los Ajustes');
    });
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const response = await requestCameraPermission();
      setError(
        response.granted ? null : 'No se concedió el permiso de cámara.'
      );
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo solicitar el permiso de cámara');
      return null;
    }
  }, [requestCameraPermission]);

  const takePhoto = useCallback(async () => {
    if (isCapturing) return null;
    if (!cameraRef.current || !isReady) {
      setError('La cámara todavía no está lista.');
      return null;
    }
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
    onCameraUnavailable,
    onMountError,
    takePhoto,
    isReady,
    isCapturing,
    error,
  };
}