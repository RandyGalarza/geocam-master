import { deletePhotoFile, persistPhoto } from '@/../services/photoFiles';
import type { Coords } from '@/types/geo';
import { and, desc, eq, isNotNull, isNull, like } from 'drizzle-orm';
import { db } from '../client';
import { photos } from '../schema';

export interface CreatePhotoInput {
  ownerId: string;
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
  ownerId: string;
  search?: string;
  albumId?: string | null;
  favoriteOnly?: boolean;
}) {
  const conditions = [eq(photos.ownerId, options?.ownerId ?? '')];

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

export function withLocationQuery(ownerId: string) {
  return db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.ownerId, ownerId),
        isNotNull(photos.latitude),
        isNotNull(photos.longitude)
      )
    )
    .orderBy(desc(photos.createdAt));
}

export async function getById(id: string, ownerId: string) {
  const result = await db.select().from(photos).where(and(eq(photos.id, id), eq(photos.ownerId, ownerId))).limit(1);
  return result[0] ?? null;
}

export async function getByClientId(clientId: string, ownerId: string) {
  const result = await db
    .select()
    .from(photos)
    .where(and(eq(photos.clientId, clientId), eq(photos.ownerId, ownerId)))
    .limit(1);
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
    ownerId: input.ownerId,
    clientId: `photo_${id}`,
    updatedAt: input.createdAt ?? Date.now(),
  };

  await db.insert(photos).values(newPhoto);
  return newPhoto;
}

export async function update(id: string, ownerId: string, data: UpdatePhotoInput) {
  const updateData: Record<string, any> = {};

  if (data.note !== undefined) updateData.note = data.note;
  if (data.favorite !== undefined) updateData.favorite = data.favorite;
  if (data.albumId !== undefined) updateData.albumId = data.albumId;

  if (Object.keys(updateData).length === 0) return;

  await db.update(photos).set({ ...updateData, updatedAt: Date.now(), syncedAt: null }).where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
}

export async function remove(id: string, ownerId: string) {
  const existing = await getById(id, ownerId);
  if (existing) {
    await db.delete(photos).where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
    deletePhotoFile(existing.uri);
  }
}

export async function clearAll(ownerId: string) {
  const allPhotos = await db.select().from(photos).where(eq(photos.ownerId, ownerId));
  await db.delete(photos).where(eq(photos.ownerId, ownerId));

  for (const photo of allPhotos) {
    deletePhotoFile(photo.uri);
  }
}

export async function pendingPhotos(ownerId: string) {
  return db.select().from(photos).where(and(eq(photos.ownerId, ownerId), isNull(photos.syncedAt))).orderBy(desc(photos.createdAt));
}

export async function markSynced(id: string, ownerId: string, path: string) {
  await db.update(photos).set({ remotePath: path, syncedAt: Date.now() }).where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
}

export async function claimLegacyPhotos(ownerId: string) {
  await db.update(photos).set({ ownerId }).where(isNull(photos.ownerId));
}
