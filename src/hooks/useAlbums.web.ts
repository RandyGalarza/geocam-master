import { createAlbum, listAlbumsQuery, removeAlbum } from '@/../db/repositories/albums';
import type { Album } from '@/types/geo';
import { useAuth } from '@/context/AuthContext';
import { subscribeToDatabaseChanges } from '@/../db/changeEvents';
import { useEffect, useMemo, useState } from 'react';

export function useAlbums() {
  const { session } = useAuth();
  const ownerId = session?.user.id ?? '';
  const [rawAlbums, setRawAlbums] = useState<Awaited<ReturnType<typeof listAlbumsQuery>>>([]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const albums = await listAlbumsQuery(ownerId);
        if (mounted) setRawAlbums(albums);
      } catch (error) {
        console.error('No se pudieron cargar los álbumes locales:', error);
      }
    };

    const unsubscribe = subscribeToDatabaseChanges(() => void refresh());
    void refresh();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [ownerId]);

  const albums: Album[] = useMemo(
    () =>
      rawAlbums.map((album) => ({
        id: album.id,
        name: album.name,
        createdAt: album.createdAt,
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

  return { albums, addAlbum, deleteAlbum };
}
