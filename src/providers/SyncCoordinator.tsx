import { useAuth } from '@/context/AuthContext';
import { syncPending } from '@/../services/cloudPhotos';
import { useNetworkState } from 'expo-network';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function SyncCoordinator() {
  const { session } = useAuth();
  const network = useNetworkState();
  const queryClient = useQueryClient();
  const ownerId = session?.user.id;

  useEffect(() => {
    if (!ownerId || network.isConnected !== true || network.isInternetReachable === false) return;
    void syncPending(ownerId, () => {}).then(() => queryClient.invalidateQueries({ queryKey: ['cloud-photos', ownerId] })).catch((error: unknown) => {
      console.warn('Sincronización automática pendiente:', error instanceof Error ? error.message : error);
    });
  }, [ownerId, network.isConnected, network.isInternetReachable, queryClient]);

  return null;
}
