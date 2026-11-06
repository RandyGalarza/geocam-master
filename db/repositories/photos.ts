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
  const conditions = [eq(photos.ownerId, options?.ownerId ?? ''), isNull(photos.deletedAt)];

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
        isNull(photos.deletedAt),
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

  const now = Date.now();
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
    updatedAt: now,
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
    const now = Date.now();
    if (existing.syncedAt !== existing.updatedAt) {
      await db.delete(photos).where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
      deletePhotoFile(existing.uri);
      return;
    }
    await db.update(photos).set({ deletedAt: now, updatedAt: now, syncedAt: null })
      .where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
  }
}

export async function clearAll(ownerId: string) {
  const allPhotos = await db.select().from(photos).where(and(eq(photos.ownerId, ownerId), isNull(photos.deletedAt)));
  for (const photo of allPhotos) await remove(photo.id, ownerId);
}

export async function pendingPhotos(ownerId: string) {
  return db.select().from(photos).where(and(eq(photos.ownerId, ownerId))).orderBy(desc(photos.updatedAt));
}

export async function applyRemotePhoto(ownerId: string, remote: {
  clientId: string; uri: string; source: string; latitude: number | null; longitude: number | null;
  createdAt: number; updatedAt: number; note: string | null; favorite: boolean; deletedAt: number | null;
}) {
  const local = await getByClientId(remote.clientId, ownerId);
  if (local && local.updatedAt > remote.updatedAt) return 'local-newer' as const;
  const common = {
    uri: local?.uri ?? remote.uri, source: remote.source, latitude: remote.latitude,
    longitude: remote.longitude, createdAt: remote.createdAt, updatedAt: remote.updatedAt,
    note: remote.note, favorite: remote.favorite, deletedAt: remote.deletedAt,
    remotePath: remote.deletedAt ? null : (remote.clientId ? `${ownerId}/${remote.clientId}.jpg` : null),
    syncedAt: Date.now(),
  };
  if (local) await db.update(photos).set(common).where(eq(photos.id, local.id));
  else await db.insert(photos).values({
    id: remote.clientId, clientId: remote.clientId, ownerId, albumId: null,
    accuracy: null, coordsTimestamp: null, ...common,
  });
  return 'remote-applied' as const;
}

export async function finalizeDeleted(id: string, ownerId: string) {
  const existing = await getById(id, ownerId);
  if (!existing?.deletedAt || !existing.syncedAt) return;
  await db.delete(photos).where(and(eq(photos.id, id), eq(photos.ownerId, ownerId)));
  deletePhotoFile(existing.uri);
}

export async function photosSyncState(ownerId: string) {
  const all = await db.select().from(photos).where(eq(photos.ownerId, ownerId));
  return { pending: all.filter((photo) => photo.syncedAt !== photo.updatedAt).length,
    lastSyncedAt: all.reduce<number | null>((latest, photo) => photo.syncedAt && (!latest || photo.syncedAt > latest) ? photo.syncedAt : latest, null),
    lastError: null as string | null, uploaded: 0, downloaded: 0 };
}

export async function markSynced(id: string, ownerId: string, path: string, uploadedUpdatedAt: number) {
  await db.update(photos).set({ remotePath: path, syncedAt: uploadedUpdatedAt })
    .where(and(eq(photos.id, id), eq(photos.ownerId, ownerId), eq(photos.updatedAt, uploadedUpdatedAt)));
}

export async function claimLegacyPhotos(ownerId: string) {
  await db.update(photos).set({ ownerId }).where(isNull(photos.ownerId));
}
