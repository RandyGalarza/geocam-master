import { deletePhotoFile, persistPhoto } from '@/../services/photoFiles';
import type { Coords } from '@/types/geo';
import { and, desc, eq, isNotNull, like } from 'drizzle-orm';
import { db } from '../client';
import { photos } from '../schema';

export interface CreatePhotoInput {
  id?: string;
  uri: string;
  source: 'camera' | 'gallery';
  coords: Coords | null;
  createdAt?: number;
  albumId?: string | null;
  note?: string | null;
  favorite?: boolean;
}

export interface UpdatePhotoInput {
  note?: string | null;
  favorite?: boolean;
  albumId?: string | null;
}

export function listQuery(options?: {
  search?: string;
  albumId?: string | null;
  favoriteOnly?: boolean;
}) {
  const conditions = [];

  if (options?.search && options.search.trim().length > 0) {
    conditions.push(like(photos.note, `%${options.search.trim()}%`));
  }

  if (options?.albumId) {
    conditions.push(eq(photos.albumId, options.albumId));
  }

  if (options?.favoriteOnly) {
    conditions.push(eq(photos.favorite, true));
  }

  const baseQuery = db.select().from(photos);

  if (conditions.length > 0) {
    return baseQuery.where(and(...conditions)).orderBy(desc(photos.createdAt));
  }

  return baseQuery.orderBy(desc(photos.createdAt));
}

export function withLocationQuery() {
  return db
    .select()
    .from(photos)
    .where(isNotNull(photos.latitude))
    .orderBy(desc(photos.createdAt));
}

export async function getById(id: string) {
  const result = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function create(input: CreatePhotoInput) {
  const id = input.id ?? `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const permanentUri = persistPhoto(input.uri);

  const newPhoto = {
    id,
    uri: permanentUri,
    source: input.source,
    latitude: input.coords?.latitude ?? null,
    longitude: input.coords?.longitude ?? null,
    accuracy: input.coords?.accuracy ?? null,
    coordsTimestamp: input.coords?.timestamp ?? null,
    createdAt: input.createdAt ?? Date.now(),
    albumId: input.albumId ?? null,
    note: input.note ?? null,
    favorite: input.favorite ?? false,
  };

  await db.insert(photos).values(newPhoto);
  return newPhoto;
}

export async function update(id: string, data: UpdatePhotoInput) {
  const updateData: Record<string, any> = {};

  if (data.note !== undefined) updateData.note = data.note;
  if (data.favorite !== undefined) updateData.favorite = data.favorite;
  if (data.albumId !== undefined) updateData.albumId = data.albumId;

  if (Object.keys(updateData).length === 0) return;

  await db.update(photos).set(updateData).where(eq(photos.id, id));
}

export async function remove(id: string) {
  const existing = await getById(id);
  if (existing) {
    await db.delete(photos).where(eq(photos.id, id));
    deletePhotoFile(existing.uri);
  }
}

export async function clearAll() {
  const allPhotos = await db.select().from(photos);
  await db.delete(photos);

  for (const photo of allPhotos) {
    deletePhotoFile(photo.uri);
  }
}

