import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;

/**
 * Singleton pattern: one connection pool for the whole process.
 * Creating a pool per request would exhaust Postgres connections.
 */
class Database {
  private static instance: { pool: pg.Pool; db: Db } | undefined;

  private constructor() {}

  static get(url = process.env.DATABASE_URL): { pool: pg.Pool; db: Db } {
    if (!Database.instance) {
      if (!url) throw new Error('DATABASE_URL is not set (or run with USE_MEMORY_DB=1)');
      const pool = new pg.Pool({ connectionString: url, max: 10 });
      Database.instance = { pool, db: drizzle(pool, { schema }) };
    }
    return Database.instance;
  }

  static async close(): Promise<void> {
    await Database.instance?.pool.end();
    Database.instance = undefined;
  }
}

export const getDb = (): Db => Database.get().db;
export const closeDb = (): Promise<void> => Database.close();
