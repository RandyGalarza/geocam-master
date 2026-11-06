import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  applyRemotePhoto, finalizeDeleted, getByClientId, markSynced, pendingPhotos,
} from '@/../db/repositories/photos';

const BUCKET = 'geocam';

async function readPhotoBytes(uri: string) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`No se pudo leer la copia local (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }
  return new File(uri).bytes();
}

export function shouldApplyRemote(localUpdatedAt: number, remoteUpdatedAt: number) {
  return remoteUpdatedAt >= localUpdatedAt;
}

export async function syncPending(ownerId: string, onProgress: (done: number, total: number) => void) {
  const pending = await pendingPhotos(ownerId);
  let uploaded = 0;
  let downloaded = 0;
  const failures: string[] = [];
  for (const photo of pending) {
    onProgress(uploaded + downloaded, pending.length);
    const path = `${ownerId}/${photo.clientId}.jpg`;
    try {
      if (photo.deletedAt) {
        const { error } = await supabase.from('photos').upsert({
          client_id: photo.clientId, user_id: ownerId, storage_path: path,
          latitude: photo.latitude, longitude: photo.longitude, note: photo.note,
          favorite: photo.favorite, source: photo.source,
          taken_at: new Date(photo.createdAt).toISOString(),
          updated_at: new Date(photo.updatedAt).toISOString(),
          deleted_at: new Date(photo.deletedAt).toISOString(),
        }, { onConflict: 'client_id' });
        if (error) throw error;
        await markSynced(photo.id, ownerId, path);
        const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
        if (storageError) throw storageError;
        await finalizeDeleted(photo.id, ownerId);
      } else {
        const bytes = await readPhotoBytes(photo.uri);
        if (!bytes.length) throw new Error('El archivo local está vacío.');
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        const { error: rowError } = await supabase.from('photos').upsert({
          client_id: photo.clientId, user_id: ownerId, storage_path: path,
          latitude: photo.latitude, longitude: photo.longitude, note: photo.note,
          favorite: photo.favorite, source: photo.source,
          taken_at: new Date(photo.createdAt).toISOString(),
          updated_at: new Date(photo.updatedAt).toISOString(), deleted_at: null,
        }, { onConflict: 'client_id' });
        if (rowError) throw rowError;
        await markSynced(photo.id, ownerId, path);
        uploaded += 1;
      }
    } catch (error) {
      failures.push(`${photo.id}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
    onProgress(uploaded + downloaded, pending.length);
  }

  const { data: remoteRows, error } = await supabase.from('photos')
    .select('client_id, storage_path, note, taken_at, source, latitude, longitude, favorite, updated_at, deleted_at')
    .eq('user_id', ownerId).order('updated_at', { ascending: true });
  if (error) throw error;
  for (const remote of remoteRows ?? []) {
    try {
      const local = await getByClientId(remote.client_id, ownerId);
      if (local && !shouldApplyRemote(local.updatedAt, new Date(remote.updated_at).getTime())) continue;
      if (remote.deleted_at && local && !local.deletedAt) {
        await applyRemotePhoto(ownerId, {
          clientId: remote.client_id, uri: local.uri, source: remote.source,
          latitude: remote.latitude, longitude: remote.longitude,
          createdAt: new Date(remote.taken_at).getTime(), updatedAt: new Date(remote.updated_at).getTime(),
          note: remote.note, favorite: remote.favorite, deletedAt: new Date(remote.deleted_at).getTime(),
        });
        await finalizeDeleted(local.id, ownerId);
        downloaded += 1;
      } else if (!remote.deleted_at && (!local || !shouldApplyRemote(local.updatedAt, new Date(remote.updated_at).getTime()))) {
        const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(remote.storage_path, 3600);
        if (signedError) throw signedError;
        const response = await fetch(signed.signedUrl);
        if (!response.ok) throw new Error('No se pudo descargar la imagen remota.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        const uri = await persistDownloadedPhoto(ownerId, remote.client_id, bytes);
        const applied = await applyRemotePhoto(ownerId, {
          clientId: remote.client_id, uri, source: remote.source,
          latitude: remote.latitude, longitude: remote.longitude,
          createdAt: new Date(remote.taken_at).getTime(), updatedAt: new Date(remote.updated_at).getTime(),
          note: remote.note, favorite: remote.favorite, deletedAt: null,
        });
        if (applied === 'remote-applied' && local && local.uri !== uri) {
          const { deletePhotoFile } = await import('@/../services/photoFiles');
          deletePhotoFile(local.uri);
        }
        downloaded += 1;
      }
    } catch (itemError) {
      failures.push(`${remote.client_id}: ${itemError instanceof Error ? itemError.message : 'error desconocido'}`);
    }
  }
  const syncedAt = Date.now();
  lastSyncAt.set(ownerId, syncedAt);
  lastSyncResult.set(ownerId, { uploaded, downloaded });
  if (failures.length) lastSyncError.set(ownerId, failures.join('\n'));
  else lastSyncError.delete(ownerId);
  await AsyncStorage.setItem(`geocam-sync-state:${ownerId}`, JSON.stringify({ syncedAt, uploaded, downloaded, error: failures.join('\n') || null }));
  return { total: pending.length, uploaded, downloaded, failed: failures.length, failures, lastSyncAt: lastSyncAt.get(ownerId) ?? null };
}

const lastSyncAt = new Map<string, number>();
const lastSyncError = new Map<string, string>();
const lastSyncResult = new Map<string, { uploaded: number; downloaded: number }>();

export function getLastSyncAt(ownerId: string) { return lastSyncAt.get(ownerId) ?? null; }
export function getLastSyncError(ownerId: string) { return lastSyncError.get(ownerId) ?? null; }
export function getLastSyncResult(ownerId: string) { return lastSyncResult.get(ownerId) ?? null; }

export async function getPersistedSyncState(ownerId: string): Promise<{ syncedAt: number | null; uploaded: number; downloaded: number; error: string | null }> {
  const raw = await AsyncStorage.getItem(`geocam-sync-state:${ownerId}`);
  return raw ? JSON.parse(raw) : { syncedAt: null, uploaded: 0, downloaded: 0, error: null };
}

async function persistDownloadedPhoto(ownerId: string, clientId: string, bytes: Uint8Array) {
  if (Platform.OS === 'web') {
    const safeBytes = new Uint8Array(bytes.byteLength);
    safeBytes.set(bytes);
    return URL.createObjectURL(new Blob([safeBytes.buffer], { type: 'image/jpeg' }));
  }
  const directory = new Directory(Paths.document, 'photos', ownerId);
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${clientId}.jpg`);
  file.write(bytes);
  return file.uri;
}

export async function listCloudPhotos(ownerId: string, options: { cursor?: string | null; search?: string; limit?: number } = {}) {
  const limit = options.limit ?? 20;
  let query = supabase.from('photos').select('client_id, storage_path, note, taken_at, source, latitude, longitude, favorite, updated_at')
    .eq('user_id', ownerId).is('deleted_at', null).order('taken_at', { ascending: false })
    .order('client_id', { ascending: false }).limit(limit + 1);
  if (options.search?.trim()) query = query.ilike('note', `%${options.search.trim()}%`);
  if (options.cursor) {
    const cursor = JSON.parse(options.cursor) as { takenAt: string; clientId: string };
    query = query.or(`taken_at.lt.${cursor.takenAt},and(taken_at.eq.${cursor.takenAt},client_id.lt.${cursor.clientId})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const photos = await Promise.all(page.map(async (photo) => {
    const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storage_path, 3600);
    return { ...photo, signedUrl: signedError ? null : signed.signedUrl, imageError: signedError?.message ?? null };
  }));
  const last = page.at(-1);
  return { photos, nextCursor: hasMore && last ? JSON.stringify({ takenAt: last.taken_at, clientId: last.client_id }) : null };
}
