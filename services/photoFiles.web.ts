export function persistPhoto(uri: string) {
  return uri;
}

export function deletePhotoFile(uri: string) {
  if (uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
  }
}
