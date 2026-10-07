import { fileURLToPath } from 'node:url';
import { count } from 'drizzle-orm';
import { getDb, closeDb, type Db } from './client.js';
import { classes, students, attendance, invoices, payments } from './schema.js';
import { generateSeed } from './seedData.js';
import { isoDate } from '../domain/fp.js';

const chunk = <T>(xs: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, i * size + size));

/** Seeds an empty database. Batches inserts so large tables load quickly. */
export const seedIfEmpty = async (db: Db): Promise<boolean> => {
  const [row] = await db.select({ n: count() }).from(classes);
  if ((row?.n ?? 0) > 0) return false;
  const data = generateSeed(isoDate(new Date()));
  await db.transaction(async (tx) => {
    await tx.insert(classes).values(data.classes);
    for (const part of chunk(data.students, 500)) await tx.insert(students).values(part);
    for (const part of chunk(data.attendance, 1000)) await tx.insert(attendance).values(part);
    for (const part of chunk(data.invoices, 500)) await tx.insert(invoices).values(part);
    for (const part of chunk(data.payments, 500)) await tx.insert(payments).values(part);
    // Explicit ids were inserted, so move each serial sequence past them
    for (const t of ['classes', 'students', 'invoices', 'payments']) {
      await tx.execute(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT MAX(id) FROM ${t}))`);
    }
  });
  return true;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log((await seedIfEmpty(getDb())) ? 'Seeded demo school' : 'Database already has data; skipped');
  await closeDb();
}
