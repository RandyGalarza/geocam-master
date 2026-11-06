import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { listCloudPhotos } from '@/../services/cloudPhotos';

export function useCloudPhotos(ownerId: string, search: string, offline: boolean) {
  const wasOffline = useRef(offline);
  const query = useInfiniteQuery({
    queryKey: ['cloud-photos', ownerId, search],
    queryFn: ({ pageParam }) => listCloudPhotos(ownerId, { cursor: pageParam, search, limit: 20, useLocalFallback: offline }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: offline ? Infinity : 60_000,
    enabled: Boolean(ownerId),
  });
  const queryData = query.data;
  const refetch = query.refetch;
  useEffect(() => {
    const changed = wasOffline.current !== offline;
    if (ownerId && (changed || (offline && !queryData))) void refetch();
    wasOffline.current = offline;
  }, [offline, ownerId, queryData, refetch]);
  return query;
}
