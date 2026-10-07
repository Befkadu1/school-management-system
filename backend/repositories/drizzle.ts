import { and, eq, gte, ilike, inArray, or, sql, count, desc } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { classes, students, attendance, invoices, payments, announcements } from '../db/schema.js';
import type { Repos } from './types.js';
import type { InvoiceWithPayments } from '../domain/types.js';

/** Postgres implementation of the repositories, using Drizzle ORM. */
export const createDrizzleRepos = (db: Db): Repos => {
  const loadPayments = async (invs: (typeof invoices.$inferSelect)[]): Promise<InvoiceWithPayments[]> => {
    if (invs.length === 0) return [];
    // One query for all payments instead of one per invoice (avoids the N+1 problem)
    const rows = await db.select().from(payments).where(inArray(payments.invoiceId, invs.map((i) => i.id)));
    const byInvoice = Map.groupBy(rows, (p) => p.invoiceId);
    return invs.map((inv) => ({ ...inv, payments: byInvoice.get(inv.id) ?? [] }));
  };

  return {
    classes: { list: () => db.select().from(classes).orderBy(classes.id) },
    students: {
      list: async ({ classId, search, limit = 50, offset = 0 } = {}) => {
        const term = search?.trim();
        const where = and(
          classId !== undefined ? eq(students.classId, classId) : undefined,
          term ? or(
            ilike(sql`${students.firstName} || ' ' || ${students.fatherName} || ' ' || ${students.grandfatherName}`, `%${term}%`),
          ) : undefined,
        );
        const [items, totals] = await Promise.all([
          db.select().from(students).where(where).orderBy(students.firstName, students.fatherName).limit(limit).offset(offset),
          db.select({ n: count() }).from(students).where(where),
        ]);
        return { items, total: totals[0]?.n ?? 0 };
      },
      get: async (id) => (await db.select().from(students).where(eq(students.id, id)))[0],
      create: async (input) => {
        const [row] = await db.insert(students).values(input).returning();
        if (!row) throw new Error('Insert failed');
        return row;
      },
    },
    attendance: {
      forClassOnDate: (classId, date) => db
        .select({ studentId: attendance.studentId, date: attendance.date, status: attendance.status })
        .from(attendance).innerJoin(students, eq(students.id, attendance.studentId))
        .where(and(eq(students.classId, classId), eq(attendance.date, date))),
      since: (date, studentId) => db
        .select({ studentId: attendance.studentId, date: attendance.date, status: attendance.status })
        .from(attendance)
        .where(and(gte(attendance.date, date), studentId !== undefined ? eq(attendance.studentId, studentId) : undefined)),
      upsertMany: async (records) => {
        if (records.length === 0) return 0;
        await db.insert(attendance).values([...records])
          .onConflictDoUpdate({ target: [attendance.studentId, attendance.date], set: { status: sql`excluded.status` } });
        return records.length;
      },
    },
    fees: {
      invoices: async ({ studentId } = {}) => loadPayments(
        await db.select().from(invoices).where(studentId !== undefined ? eq(invoices.studentId, studentId) : undefined).orderBy(invoices.id)),
      invoice: async (id) => (await loadPayments(await db.select().from(invoices).where(eq(invoices.id, id))))[0],
      addPayment: async (p) => {
        const [row] = await db.insert(payments).values(p).returning();
        if (!row) throw new Error('Insert failed');
        return row;
      },
    },
    announcements: {
      list: () => db.select().from(announcements).orderBy(desc(announcements.createdAt)),
      create: async (a) => {
        const [row] = await db.insert(announcements).values(a).returning();
        if (!row) throw new Error('Insert failed');
        return row;
      },
    },
  };
};
