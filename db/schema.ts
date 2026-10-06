import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at').notNull(),
});

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
});

export type DBPhoto = typeof photos.$inferSelect;
export type DBAlbum = typeof albums.$inferSelect;