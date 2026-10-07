import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb, closeDb } from './client.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const migrationsFolder = path.resolve(here, '../../drizzle');

export const runMigrations = () => migrate(getDb(), { migrationsFolder });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runMigrations();
  console.log('Migrations applied');
  await closeDb();
}
