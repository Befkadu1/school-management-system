import type { Repos, StudentQuery } from './types.js';
import type { SeedData } from '../db/seed-data.js';
import type { Announcement, AttendanceRecord, InvoiceWithPayments, Payment, Student } from '../domain/types.js';

const fullName = (s: Student) => `${s.firstName} ${s.fatherName} ${s.grandfatherName}`.toLowerCase();

/** In-memory repositories: used by tests and by `npm run dev:memory` (no Postgres needed). */
export const createMemoryRepos = (seed: SeedData, now = () => new Date().toISOString()): Repos => {
  const db = {
    classes: [...seed.classes],
    students: [...seed.students],
    attendance: new Map(seed.attendance.map((r) => [`${r.studentId}:${r.date}`, r] as const)),
    invoices: [...seed.invoices],
    payments: [...seed.payments],
    announcements: [] as Announcement[],
  };
  const withPayments = (inv: (typeof db.invoices)[number]): InvoiceWithPayments =>
    ({ ...inv, payments: db.payments.filter((p) => p.invoiceId === inv.id) });

  return {
    classes: { list: async () => db.classes },
    students: {
      list: async ({ classId, search, limit = 50, offset = 0 }: StudentQuery = {}) => {
        const term = search?.trim().toLowerCase();
        const matches = db.students.filter((s) =>
          (classId === undefined || s.classId === classId) && (!term || fullName(s).includes(term)));
        return { items: matches.slice(offset, offset + limit), total: matches.length };
      },
      get: async (id) => db.students.find((s) => s.id === id),
      create: async (input) => {
        const student: Student = { ...input, id: Math.max(0, ...db.students.map((s) => s.id)) + 1, enrolledAt: now() };
        db.students.push(student);
        return student;
      },
    },
    attendance: {
      forClassOnDate: async (classId, date) => {
        const ids = new Set(db.students.filter((s) => s.classId === classId).map((s) => s.id));
        return [...db.attendance.values()].filter((r) => r.date === date && ids.has(r.studentId));
      },
      since: async (date, studentId) => [...db.attendance.values()]
        .filter((r) => r.date >= date && (studentId === undefined || r.studentId === studentId)),
      upsertMany: async (records: readonly AttendanceRecord[]) => {
        records.forEach((r) => db.attendance.set(`${r.studentId}:${r.date}`, r));
        return records.length;
      },
    },
    fees: {
      invoices: async ({ studentId } = {}) =>
        db.invoices.filter((i) => studentId === undefined || i.studentId === studentId).map(withPayments),
      invoice: async (id) => { const inv = db.invoices.find((i) => i.id === id); return inv && withPayments(inv); },
      addPayment: async (p) => {
        const payment: Payment = { ...p, id: db.payments.length + 1, paidAt: now() };
        db.payments.push(payment);
        return payment;
      },
    },
    announcements: {
      list: async () => [...db.announcements].reverse(),
      create: async (a) => {
        const ann: Announcement = { ...a, id: db.announcements.length + 1, createdAt: now() };
        db.announcements.push(ann);
        return ann;
      },
    },
  };
};
