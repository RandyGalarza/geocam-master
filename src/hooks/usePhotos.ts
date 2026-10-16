import {
  clearAll,
  create,
  listQuery,
  remove,
  update,
  withLocationQuery,
} from '@/../db/repositories/photos';
import type { Coords, GeoPhoto } from '@/types/geo';
import { mapDbPhotoToGeoPhoto } from '@/utils/photoMapper';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

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

  // Consulta en vivo con filtros de búsqueda por nota, álbum y favoritos
  const filteredQuery = useMemo(
    () => listQuery({ search, albumId, favoriteOnly, ownerId }),
    [search, albumId, favoriteOnly, ownerId]
  );

  const { data: rawPhotos = [] } = useLiveQuery(filteredQuery, [search, albumId, favoriteOnly]);

  // Consulta en vivo con isNotNull(photos.latitude) para el Mapa
  const locQuery = useMemo(() => withLocationQuery(ownerId), [ownerId]);
  const { data: rawLocPhotos = [] } = useLiveQuery(locQuery, [ownerId]);

  const photos = useMemo<GeoPhoto[]>(
    () => rawPhotos.map(mapDbPhotoToGeoPhoto),
    [rawPhotos]
  );

  const photosWithLocation = useMemo<GeoPhoto[]>(
    () => rawLocPhotos.map(mapDbPhotoToGeoPhoto),
    [rawLocPhotos]
  );

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
    addPhoto,
    removePhoto,
    clearAll: clearAllPhotos,
    updatePhoto,
    ownerId,
  };
}

