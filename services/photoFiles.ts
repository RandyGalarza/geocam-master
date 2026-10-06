import { Directory, File, Paths } from 'expo-file-system';

const photosDir = new Directory(Paths.document, 'photos');

export function persistPhoto(cacheUri: string): string {
  try {
    if (!photosDir.exists) {
      photosDir.create();
    }
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    const destination = new File(photosDir, filename);
    const source = new File(cacheUri);
    source.copy(destination);
    return destination.uri;
  } catch (error) {
    console.warn('[photoFiles] No se pudo copiar a documentos, se mantiene URI original:', error);
    return cacheUri;
  }
}

export function deletePhotoFile(uri: string) {
  try {
    if (!uri) return;
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    console.warn('[photoFiles] Error al eliminar archivo permanente:', err);
  }
}

