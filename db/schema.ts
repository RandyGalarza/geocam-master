import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
  ownerId: text('owner_id'),
}, (table) => [uniqueIndex('albums_owner_name_unique').on(table.ownerId, table.name)]);

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  uri: text('uri').notNull(),
  source: text('source').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  accuracy: real('accuracy'),
  coordsTimestamp: integer('coords_timestamp'),
  createdAt: integer('created_at').notNull(),
  albumId: text('album_id').references(() => albums.id, { onDelete: 'set null' }),
  note: text('note'),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  ownerId: text('owner_id'),
  clientId: text('client_id').notNull(),
  updatedAt: integer('updated_at').notNull(),
  remotePath: text('remote_path'),
  syncedAt: integer('synced_at'),
});

export type DBPhoto = typeof photos.$inferSelect;
export type DBAlbum = typeof albums.$inferSelect;
