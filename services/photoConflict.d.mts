export type VersionedPhoto<T = unknown> = T & { updatedAt: number };
export function resolvePhotoConflict<L extends { updatedAt: number }, R extends { updatedAt: number }>(local: L | null, remote: R): L | R;
export function shouldApplyRemote(localUpdatedAt: number, remoteUpdatedAt: number): boolean;
