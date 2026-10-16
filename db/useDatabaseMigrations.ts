import migrations from '../drizzle/migrations';
import { db } from './client';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

export function useDatabaseMigrations() {
  return useMigrations(db, migrations);
}
