import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { openDatabaseAsync } from 'expo-sqlite';
import * as schema from './schema';
import { notifyDatabaseChanged } from './changeEvents';

export const expoDb = openDatabaseAsync('geocam.db');

export const db = drizzle(async (query, params, method) => {
  const database = await expoDb;

  if (method === 'run') {
    await database.runAsync(query, params);
    notifyDatabaseChanged();
    return { rows: [] };
  }

  if (method === 'all') {
    return { rows: await database.getAllAsync(query, params) };
  }

  if (method === 'get') {
    const row = await database.getFirstAsync<Record<string, unknown>>(query, params);
    return { rows: row ? Object.values(row) : [] };
  }

  const rows = await database.getAllAsync<Record<string, unknown>>(query, params);
  return { rows: rows.map((row) => Object.values(row)) };
}, { schema });
