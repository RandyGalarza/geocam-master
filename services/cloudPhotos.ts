import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { markSynced, pendingPhotos } from '@/../db/repositories/photos';

const BUCKET = 'geocam';

export async function syncPending(ownerId: string, onProgress: (done: number, total: number) => void) {
  const pending = await pendingPhotos(ownerId);
  let done = 0;
  const failures: string[] = [];
  for (const photo of pending) {
    onProgress(done, pending.length);
    const path = `${ownerId}/${photo.clientId}.jpg`;
    try {
      const file = new File(photo.uri);
      const bytes = await file.bytes();
      if (!bytes.length) throw new Error('El archivo local está vacío.');
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from('photos').upsert({
        client_id: photo.clientId,
        user_id: ownerId,
        storage_path: path,
        latitude: photo.latitude,
        longitude: photo.longitude,
        note: photo.note,
        favorite: photo.favorite,
        source: photo.source,
        taken_at: new Date(photo.createdAt).toISOString(),
        updated_at: new Date(photo.updatedAt).toISOString(),
      }, { onConflict: 'client_id' });
      if (rowError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw rowError;
      }
      await markSynced(photo.id, ownerId, path);
    } catch (error) {
      failures.push(`${photo.id}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
    done += 1;
    onProgress(done, pending.length);
  }
  return { total: pending.length, failed: failures.length, failures };
}

export async function deleteRemotePhoto(photo: { remotePath: string | null; clientId: string; localUri: string }) {
  if (!photo.remotePath) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('Inicia sesión para borrar una foto sincronizada.');
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.remotePath]);
  if (storageError) throw storageError;
  const { error: rowError } = await supabase.from('photos').delete().eq('client_id', photo.clientId);
  if (rowError) {
    const bytes = await new File(photo.localUri).bytes();
    const { error: restoreError } = await supabase.storage.from(BUCKET).upload(photo.remotePath, bytes, { contentType: 'image/jpeg', upsert: true });
    if (restoreError) throw new Error(`Falló el borrado de la fila y la restauración del archivo: ${rowError.message}; ${restoreError.message}`);
    throw rowError;
  }
}

export async function listCloudPhotos(ownerId: string) {
  const { data, error } = await supabase.from('photos').select('client_id, storage_path, note, taken_at, source, latitude, longitude').eq('user_id', ownerId).order('taken_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (photo) => {
    const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storage_path, 3600);
    if (signedError) throw signedError;
    return { ...photo, signedUrl: signed.signedUrl };
  }));
}
