import {
  clearAll,
  create,
  listQuery,
  remove,
  update,
  withLocationQuery,
} from '@/../db/repositories/photos';
import type { Coords, GeoPhoto } from '@/types/geo';
import { useAuth } from '@/context/AuthContext';
import { subscribeToDatabaseChanges } from '@/../db/changeEvents';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapDbPhotoToGeoPhoto } from '@/utils/photoMapper';

export interface UsePhotosOptions {
  search?: string;
  albumId?: string | null;
  favoriteOnly?: boolean;
}

export function usePhotos(options?: UsePhotosOptions) {
  const search = options?.search ?? '';
  const albumId = options?.albumId ?? null;
  const favoriteOnly = options?.favoriteOnly ?? false;
  const { session } = useAuth();
  const ownerId = session?.user.id ?? '';
  const [rawPhotos, setRawPhotos] = useState<Awaited<ReturnType<typeof listQuery>>>([]);
  const [rawLocPhotos, setRawLocPhotos] = useState<Awaited<ReturnType<typeof withLocationQuery>>>([]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const [photos, photosWithLocation] = await Promise.all([
          listQuery({ search, albumId, favoriteOnly, ownerId }),
          withLocationQuery(ownerId),
        ]);
        if (mounted) {
          setRawPhotos(photos);
          setRawLocPhotos(photosWithLocation);
        }
      } catch (error) {
        console.error('No se pudieron cargar las fotos locales:', error);
      }
    };

    const unsubscribe = subscribeToDatabaseChanges(() => void refresh());
    void refresh();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [search, albumId, favoriteOnly, ownerId]);

  const photos = useMemo<GeoPhoto[]>(
    () => rawPhotos.map(mapDbPhotoToGeoPhoto),
    [rawPhotos]
  );

  const photosWithLocation = useMemo<GeoPhoto[]>(
    () => rawLocPhotos.map(mapDbPhotoToGeoPhoto),
    [rawLocPhotos]
  );

  const refresh = useCallback(async () => {
    const [photos, photosWithLocation] = await Promise.all([
      listQuery({ search, albumId, favoriteOnly, ownerId }),
      withLocationQuery(ownerId),
    ]);
    setRawPhotos(photos);
    setRawLocPhotos(photosWithLocation);
  }, [search, albumId, favoriteOnly, ownerId]);

  const addPhoto = async (input: {
    uri: string;
    source: 'camera' | 'gallery';
    coords: Coords | null;
    albumId?: string | null;
    note?: string | null;
    favorite?: boolean;
  }) => {
    if (!ownerId) throw new Error('Inicia sesión para guardar fotos.');
    return await create({ ...input, ownerId });
  };

  const removePhoto = async (id: string) => {
    if (!ownerId) throw new Error('Inicia sesión para eliminar fotos.');
    await remove(id, ownerId);
  };

  const clearAllPhotos = async () => {
    if (!ownerId) throw new Error('Inicia sesión para borrar fotos.');
    await clearAll(ownerId);
  };

  const updatePhoto = async (
    id: string,
    data: { note?: string | null; favorite?: boolean; albumId?: string | null }
  ) => {
    if (!ownerId) throw new Error('Inicia sesión para editar fotos.');
    await update(id, ownerId, data);
  };

  return {
    photos,
    photosWithLocation,
    refresh,
    addPhoto,
    removePhoto,
    clearAll: clearAllPhotos,
    updatePhoto,
    ownerId,
  };
}
