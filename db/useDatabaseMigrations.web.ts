import { useEffect, useState } from 'react';
import migrations from '../drizzle/migrations';
import { expoDb } from './client.web';

let migrationPromise: Promise<void> | undefined;

async function migrateDatabase() {
  const database = await expoDb;
  await database.execAsync(
    'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
  );

  const lastMigration = await database.getFirstAsync<{ created_at: number }>(
    'SELECT created_at FROM "__drizzle_migrations" ORDER BY created_at DESC LIMIT 1'
  );

  const migrationFiles: Record<string, string> = migrations.migrations;
  await database.withTransactionAsync(async () => {
    for (const entry of migrations.journal.entries) {
      if (lastMigration && Number(lastMigration.created_at) >= entry.when) continue;

      const query = migrationFiles[`m${entry.idx.toString().padStart(4, '0')}`];
      if (!query) {
        throw new Error(`Falta la migración: ${entry.tag}`);
      }

      for (const statement of query.split('--> statement-breakpoint')) {
        await database.execAsync(statement);
      }
      await database.runAsync(
        'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)',
        '',
        entry.when
      );
    }
  });
}

function ensureDatabaseMigrated() {
  if (!migrationPromise) {
    migrationPromise = migrateDatabase().catch((error: unknown) => {
      migrationPromise = undefined;
      throw error;
    });
  }
  return migrationPromise;
}

export function useDatabaseMigrations() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let mounted = true;

    ensureDatabaseMigrated().then(
      () => {
        if (mounted) setSuccess(true);
      },
      (migrationError: unknown) => {
        if (mounted) {
          setError(
            migrationError instanceof Error ? migrationError : new Error(String(migrationError))
          );
        }
      }
    );

    return () => {
      mounted = false;
    };
  }, []);

  return { success, error };
}
