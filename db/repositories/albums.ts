import { desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { albums } from '../schema';

export function listAlbumsQuery() {
  return db.select().from(albums).orderBy(desc(albums.createdAt));
}

export async function createAlbum(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('El nombre del álbum no puede estar vacío');
  }

  const id = `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newAlbum = {
    id,
    name: trimmedName,
    createdAt: Date.now(),
  };

  await db.insert(albums).values(newAlbum);
  return newAlbum;
}

export async function removeAlbum(id: string) {
  await db.delete(albums).where(eq(albums.id, id));
}

