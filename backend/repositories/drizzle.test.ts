import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../db/schema.js';
import { migrationsFolder } from '../db/migrate.js';
import { seedIfEmpty } from '../db/seed.js';
import { createDrizzleRepos } from './drizzle.js';
import type { Db } from '../db/client.js';
import type { Repos } from './types.js';

// Runs the real SQL migrations and Drizzle queries against PGlite,
// a Postgres build that runs in-process, so no Docker is needed for this test.
let repos: Repos;

beforeAll(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder });
  const asDb = db as unknown as Db; // same query-builder API, different driver type
  if (!(await seedIfEmpty(asDb))) throw new Error('Expected a fresh database to be seeded');
  repos = createDrizzleRepos(asDb);
}, 30_000);

describe('drizzle repositories (PGlite)', () => {
  it('lists and searches students with a total count', async () => {
    const all = await repos.students.list({ limit: 5 });
    expect(all.items).toHaveLength(5);
    expect(all.total).toBeGreaterThan(300);
    const first = all.items[0]!;
    const found = await repos.students.list({ search: first.fatherName.slice(0, 4) });
    expect(found.items.some((s) => s.id === first.id)).toBe(true);
  });

  it('creates a student after seeding (sequence was reset)', async () => {
    const s = await repos.students.create({ firstName: 'Test', fatherName: 'Student', grandfatherName: 'Case', gender: 'F', classId: 1, guardianName: 'G', guardianPhone: '+251911000000' });
    expect(s.id).toBeGreaterThan(300);
  });

  it('upserts attendance on the unique (student, date) index', async () => {
    const dateAfterSeededRange = '2100-01-04';
    await repos.attendance.upsertMany([{ studentId: 1, date: dateAfterSeededRange, status: 'absent' }]);
    await repos.attendance.upsertMany([{ studentId: 1, date: dateAfterSeededRange, status: 'late' }]);
    const rows = await repos.attendance.since(dateAfterSeededRange, 1);
    expect(rows).toEqual([{ studentId: 1, date: dateAfterSeededRange, status: 'late' }]);
  });

  it('loads invoices with their payments in two queries', async () => {
    const invoices = await repos.fees.invoices({ studentId: 1 });
    expect(invoices[0]).toHaveProperty('payments');
  });
});
