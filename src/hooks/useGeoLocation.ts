import type { Coords, PermissionState } from '@/types/geo';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

interface Options {
  watch?: boolean;
}

interface GeoLocationState {
  permission: PermissionState;
  coords: Coords | null;
  error: string | null;
}

function mapPermission(res: Location.LocationPermissionResponse): PermissionState {
  if (res.granted) return 'granted';
  if (!res.canAskAgain) return 'blocked';
  if (res.status === 'undetermined') return 'undetermined';
  return 'denied';
}

function toCoords(loc: Location.LocationObject): Coords {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy,
    timestamp: loc.timestamp,
  };
}

export function useGeoLocation({ watch = false }: Options = {}) {
  const [state, setState] = useState<GeoLocationState>({
    permission: 'checking',
    coords: null,
    error: null,
  });

  // 1. Al montar: solo CONSULTAR el permiso, nunca pedirlo
  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then((res) => {
        if (!cancelled) {
          setState((s) => ({ ...s, permission: mapPermission(res) }));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            permission: 'denied',
            error: e instanceof Error ? e.message : 'Error al verificar permisos de ubicación',
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Solicitar permiso por acción explícita del usuario
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      setState((s) => ({ ...s, permission: mapPermission(res), error: null }));
      return res.granted;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al solicitar permiso de ubicación';
      setState((s) => ({ ...s, error: message }));
      return false;
    }
  }, []);

  // 3. Lectura única, útil justo antes de tomar la foto
  const getCurrent = useCallback(async (): Promise<Coords | null> => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = toCoords(loc);
      setState((s) => ({ ...s, coords, error: null }));
      return coords;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'No se pudo obtener la ubicación';
      setState((s) => ({ ...s, error: message }));
      return null;
    }
  }, []);

  // 4. Seguimiento continuo con limpieza segura ante desmontaje
  useEffect(() => {
    if (!watch || state.permission !== 'granted') return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (loc) => {
        setState((s) => ({ ...s, coords: toCoords(loc), error: null }));
      }
    )
      .then((sub) => {
        if (cancelled) {
          console.log('[useGeoLocation] Limpieza temprana: se desmontó antes de resolver suscripción GPS');
          sub.remove();
        } else {
          subscription = sub;
        }
      })
      .catch((e: unknown) => {
        setState((s) => ({
          ...s,
          error: e instanceof Error ? e.message : 'Error de GPS',
        }));
      });

    return () => {
      cancelled = true;
      console.log('[useGeoLocation] Deteniendo seguimiento GPS (cleanup)');
      subscription?.remove();
    };
  }, [watch, state.permission]);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  return { ...state, requestPermission, getCurrent, openSettings };
}