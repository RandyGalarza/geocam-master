import type { GeoPhoto } from '@/types/geo';
import React, { createContext, useCallback, useContext, useState } from 'react';

export type NewGeoPhotoInput = Omit<GeoPhoto, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: number;
};

export interface GeoPhotosContextValue {
  photos: GeoPhoto[];
  addPhoto: (photo: NewGeoPhotoInput) => GeoPhoto;
  removePhoto: (id: string) => void;
  clearAll: () => void;
}

const GeoPhotosContext = createContext<GeoPhotosContextValue | undefined>(undefined);

export function GeoPhotosProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<GeoPhoto[]>([]);

  const addPhoto = useCallback((input: NewGeoPhotoInput): GeoPhoto => {
    const newPhoto: GeoPhoto = {
      id: input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: input.createdAt ?? Date.now(),
      uri: input.uri,
      coords: input.coords,
      source: input.source,
    };

    setPhotos((prevPhotos) => [newPhoto, ...prevPhotos]);
    return newPhoto;
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prevPhotos) => prevPhotos.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setPhotos([]);
  }, []);

  return (
    <GeoPhotosContext.Provider value={{ photos, addPhoto, removePhoto, clearAll }}>
      {children}
    </GeoPhotosContext.Provider>
  );
}

export function useGeoPhotos(): GeoPhotosContextValue {
  const context = useContext(GeoPhotosContext);
  if (!context) {
    throw new Error('useGeoPhotos debe ser utilizado dentro de un GeoPhotosProvider');
  }
  return context;
}
