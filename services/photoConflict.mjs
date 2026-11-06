/** Remote wins ties; this function has no database, network, or UI dependencies. */
export function resolvePhotoConflict(local, remote) {
  return local && local.updatedAt > remote.updatedAt ? local : remote;
}

export function shouldApplyRemote(localUpdatedAt, remoteUpdatedAt) {
  return remoteUpdatedAt >= localUpdatedAt;
}
