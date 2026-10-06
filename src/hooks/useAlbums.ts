import { createAlbum, listAlbumsQuery, removeAlbum } from '@/../db/repositories/albums';
import type { Album } from '@/types/geo';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

export function useAlbums() {
  const query = useMemo(() => listAlbumsQuery(), []);
  const { data: rawAlbums = [] } = useLiveQuery(query, []);

  const albums: Album[] = useMemo(
    () =>
      rawAlbums.map((a) => ({
        id: a.id,
        name: a.name,
        createdAt: a.createdAt,
      })),
    [rawAlbums]
  );

  const addAlbum = async (name: string) => {
    return await createAlbum(name);
  };

  const deleteAlbum = async (id: string) => {
    await removeAlbum(id);
  };

  return {
    albums,
    addAlbum,
    deleteAlbum,
  };
}

