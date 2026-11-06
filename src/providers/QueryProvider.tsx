import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 7 * 24 * 60 * 60 * 1000, retry: 1 } },
});

const persister = {
  persistClient: async (client: unknown) => AsyncStorage.setItem('geocam-query-cache', JSON.stringify(client)),
  restoreClient: async () => {
    const cached = await AsyncStorage.getItem('geocam-query-cache');
    return cached ? JSON.parse(cached) : undefined;
  },
  removeClient: async () => AsyncStorage.removeItem('geocam-query-cache'),
};

export function QueryProvider({ children }: { children: ReactNode }) {
  return <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60 * 1000 }}>{children}</PersistQueryClientProvider>;
}
