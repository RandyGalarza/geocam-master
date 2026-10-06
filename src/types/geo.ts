export type PermissionState =
  | 'checking'
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'blocked';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface GeoPhoto {
  id: string;
  uri: string;
  coords: Coords | null;
  source: 'camera' | 'gallery';
  createdAt: number;
  note?: string | null;
  favorite?: boolean;
  albumId?: string | null;
}

export interface Album {
  id: string;
  name: string;
  createdAt: number;
}