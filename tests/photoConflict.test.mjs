import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePhotoConflict } from '../services/photoConflict.mjs';

test('conserva la edición local cuando su updatedAt es posterior', () => {
  const local = { updatedAt: 105, note: 'local nuevo' };
  const remote = { updatedAt: 103, note: 'remoto viejo' };
  assert.equal(resolvePhotoConflict(local, remote), local);
});

test('aplica la fila remota cuando es posterior', () => {
  const local = { updatedAt: 103, note: 'local viejo' };
  const remote = { updatedAt: 105, note: 'remoto nuevo' };
  assert.equal(resolvePhotoConflict(local, remote), remote);
});

test('el remoto gana si las marcas de tiempo empatan', () => {
  const local = { updatedAt: 105, note: 'local' };
  const remote = { updatedAt: 105, note: 'remoto' };
  assert.equal(resolvePhotoConflict(local, remote), remote);
});

test('un tombstone remoto posterior gana frente a una foto local anterior', () => {
  const local = { updatedAt: 105, deletedAt: null };
  const remote = { updatedAt: 110, deletedAt: 110 };
  assert.equal(resolvePhotoConflict(local, remote), remote);
});
