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

export interface UsePhotosOptions {
  search?: string;
  albumId?: string | null;
  favoriteOnly?: boolean;
}

export function usePhotos(options?: UsePhotosOptions) {
  const search = options?.search ?? '';
  const albumId = options?.albumId ?? null;
  const favoriteOnly = options?.favoriteOnly ?? false;

  // Consulta en vivo con filtros de búsqueda por nota, álbum y favoritos
  const filteredQuery = useMemo(
    () => listQuery({ search, albumId, favoriteOnly }),
    [search, albumId, favoriteOnly]
  );

  const { data: rawPhotos = [] } = useLiveQuery(filteredQuery, [search, albumId, favoriteOnly]);

  // Consulta en vivo con isNotNull(photos.latitude) para el Mapa
  const locQuery = useMemo(() => withLocationQuery(), []);
  const { data: rawLocPhotos = [] } = useLiveQuery(locQuery, []);

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
    return await create(input);
  };

  const removePhoto = async (id: string) => {
    await remove(id);
  };

  const clearAllPhotos = async () => {
    await clearAll();
  };

  const updatePhoto = async (
    id: string,
    data: { note?: string | null; favorite?: boolean; albumId?: string | null }
  ) => {
    await update(id, data);
  };

  return {
    photos,
    photosWithLocation,
    addPhoto,
    removePhoto,
    clearAll: clearAllPhotos,
    updatePhoto,
  };
}

