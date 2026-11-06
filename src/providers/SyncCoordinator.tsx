import { useAuth } from '@/context/AuthContext';
import { syncPending } from '@/../services/cloudPhotos';
import { useNetworkState } from 'expo-network';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function SyncCoordinator() {
  const { session } = useAuth();
  const network = useNetworkState();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session || network.isConnected !== true || network.isInternetReachable === false) return;
    void syncPending(session.user.id, () => {}).then(() => queryClient.invalidateQueries({ queryKey: ['cloud-photos', session.user.id] })).catch((error: unknown) => {
      console.warn('Sincronización automática pendiente:', error instanceof Error ? error.message : error);
    });
  }, [session?.user.id, network.isConnected, network.isInternetReachable, queryClient]);

  return null;
}
