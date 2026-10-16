import { createAlbum, listAlbumsQuery, removeAlbum } from '@/../db/repositories/albums';
import type { Album } from '@/types/geo';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useAlbums() {
  const { session } = useAuth();
  const ownerId = session?.user.id ?? '';
  const query = useMemo(() => listAlbumsQuery(ownerId), [ownerId]);
  const { data: rawAlbums = [] } = useLiveQuery(query, [ownerId]);

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
    if (!ownerId) throw new Error('Inicia sesión para crear álbumes.');
    return await createAlbum(name, ownerId);
  };

  const deleteAlbum = async (id: string) => {
    await removeAlbum(id, ownerId);
  };

  return {
    albums,
    addAlbum,
    deleteAlbum,
  };
}

