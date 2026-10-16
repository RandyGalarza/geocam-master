import { desc, eq, and, isNull } from 'drizzle-orm';
import { db } from '../client';
import { albums } from '../schema';

export function listAlbumsQuery(ownerId: string) {
  return db.select().from(albums).where(eq(albums.ownerId, ownerId)).orderBy(desc(albums.createdAt));
}

export async function createAlbum(name: string, ownerId: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('El nombre del álbum no puede estar vacío');
  }

  const id = `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newAlbum = {
    id,
    name: trimmedName,
    createdAt: Date.now(),
    ownerId,
  };

  await db.insert(albums).values(newAlbum);
  return newAlbum;
}

export async function removeAlbum(id: string, ownerId: string) {
  await db.delete(albums).where(and(eq(albums.id, id), eq(albums.ownerId, ownerId)));
}

export async function claimLegacyAlbums(ownerId: string) {
  await db.update(albums).set({ ownerId }).where(isNull(albums.ownerId));
}

