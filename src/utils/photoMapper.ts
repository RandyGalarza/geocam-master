import type { DBPhoto } from '@/../db/schema';
import type { GeoPhoto } from '@/types/geo';

export function mapDbPhotoToGeoPhoto(dbPhoto: DBPhoto): GeoPhoto {
  return {
    id: dbPhoto.id,
    uri: dbPhoto.uri,
    source: dbPhoto.source as 'camera' | 'gallery',
    createdAt: dbPhoto.createdAt,
    coords:
      dbPhoto.latitude !== null && dbPhoto.longitude !== null
        ? {
            latitude: dbPhoto.latitude,
            longitude: dbPhoto.longitude,
            accuracy: dbPhoto.accuracy,
            timestamp: dbPhoto.coordsTimestamp ?? dbPhoto.createdAt,
          }
        : null,
    note: dbPhoto.note,
    favorite: dbPhoto.favorite,
    albumId: dbPhoto.albumId,
  };
}

