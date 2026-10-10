import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabaseClient(connectionUrl: string): {
  client: postgres.Sql;
  db: Database;
} {
  const client = postgres(connectionUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });
  return { client, db };
}

export async function runMigrations(
  db: Database,
  migrationsFolder: string,
): Promise<void> {
  await migrate(db, { migrationsFolder });
}
