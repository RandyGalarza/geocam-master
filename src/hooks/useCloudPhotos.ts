import { useInfiniteQuery } from '@tanstack/react-query';
import { listCloudPhotos } from '@/../services/cloudPhotos';

export function useCloudPhotos(ownerId: string, search: string, offline: boolean) {
  return useInfiniteQuery({
    queryKey: ['cloud-photos', ownerId, search],
    queryFn: ({ pageParam }) => listCloudPhotos(ownerId, { cursor: pageParam, search, limit: 20, useLocalFallback: offline }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(ownerId),
  });
}
