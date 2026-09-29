import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

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

type SensorSubscription = ReturnType<typeof Accelerometer.addListener>;

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
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (cancelled) return;

        setState({ isAvailable: available, error: null });

        if (!available) return;

        Accelerometer.setUpdateInterval(intervalMs);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const totalG = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          if (totalG > threshold && now - lastShakeTimestampRef.current > cooldownMs) {
            lastShakeTimestampRef.current = now;
            onShakeRef.current();
          }
        });
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error al inicializar acelerómetro';
          setState({ isAvailable: false, error: message });
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [threshold, intervalMs, cooldownMs, enabled]);

  return state;
}
