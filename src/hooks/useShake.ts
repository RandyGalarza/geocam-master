import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export interface UseShakeOptions {
  threshold?: number;
  intervalMs?: number;
  cooldownMs?: number;
  enabled?: boolean;
}

export interface UseShakeState {
  isAvailable: boolean | null;
  error: string | null;
}

type SensorSubscription = {
  remove: () => void;
};

export function useShake(
  onShake: () => void,
  { threshold = 2.0, intervalMs = 100, cooldownMs = 1000, enabled = true }: UseShakeOptions = {}
): UseShakeState {
  const [state, setState] = useState<UseShakeState>({
    isAvailable: null,
    error: null,
  });

  const onShakeRef = useRef(onShake);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  const lastShakeTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let subscription: SensorSubscription | null = null;

    async function subscribe() {
      if (Platform.OS === 'web') {
        if (!cancelled) setState({ isAvailable: false, error: null });
        return;
      }

      try {
        const isSupported =
          typeof Accelerometer?.isAvailableAsync === 'function'
            ? await Accelerometer.isAvailableAsync()
            : false;

        if (cancelled) return;

        if (!isSupported) {
          setState({ isAvailable: false, error: null });
          return;
        }

        // En entornos como Expo Go o New Architecture, _nativeModule puede requerir NativeEventEmitter
        const nativeModule = (Accelerometer as any)?._nativeModule;
        if (nativeModule && typeof nativeModule.addListener !== 'function') {
          const target =
            NativeModules.ExponentAccelerometer ??
            NativeModules.NativeUnimoduleProxy ??
            nativeModule;
          try {
            const emitter = new NativeEventEmitter(target);
            nativeModule.addListener = (eventName: string, listener: (...args: any[]) => void) =>
              emitter.addListener(eventName, listener);
            nativeModule.removeAllListeners = (eventName: string) =>
              emitter.removeAllListeners(eventName);
          } catch (e) {
            console.warn('[useShake] No se pudo vincular NativeEventEmitter para el acelerómetro:', e);
          }
        }

        if (
          typeof Accelerometer.addListener !== 'function' ||
          (nativeModule && typeof nativeModule.addListener !== 'function')
        ) {
          console.warn('[useShake] El acelerómetro no admite suscripción de eventos en este entorno.');
          setState({ isAvailable: false, error: null });
          return;
        }

        if (typeof Accelerometer.setUpdateInterval === 'function') {
          Accelerometer.setUpdateInterval(intervalMs);
        }

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const totalG = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          if (totalG > threshold && now - lastShakeTimestampRef.current > cooldownMs) {
            lastShakeTimestampRef.current = now;
            onShakeRef.current();
          }
        });

        setState({ isAvailable: true, error: null });
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('[useShake] Acelerómetro no disponible:', message);
          // Degradación elegante: marcar como no disponible sin romper la UI
          setState({ isAvailable: false, error: null });
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      try {
        subscription?.remove();
      } catch {
        // Ignorar fallo al desuscribir
      }
    };
  }, [threshold, intervalMs, cooldownMs, enabled]);

  return state;
}
