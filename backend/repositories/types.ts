import type {
  SchoolClass, Student, NewStudent, AttendanceRecord, InvoiceWithPayments, Invoice,
  Payment, NewPayment, Announcement, NewAnnouncement,
} from '../domain/types.js';

// Repository pattern: the rest of the app depends on these interfaces,
// not on Postgres. That lets us swap in an in-memory version for tests.

export interface StudentQuery { classId?: number; search?: string; limit?: number; offset?: number }

export interface Repos {
  classes: { list(): Promise<SchoolClass[]> };
  students: {
    list(q?: StudentQuery): Promise<{ items: Student[]; total: number }>;
    get(id: number): Promise<Student | undefined>;
    create(input: NewStudent): Promise<Student>;
  };
  attendance: {
    forClassOnDate(classId: number, date: string): Promise<AttendanceRecord[]>;
    since(date: string, studentId?: number): Promise<AttendanceRecord[]>;
    upsertMany(records: readonly AttendanceRecord[]): Promise<number>;
  };
  fees: {
    invoices(q?: { studentId?: number }): Promise<InvoiceWithPayments[]>;
    invoice(id: number): Promise<InvoiceWithPayments | undefined>;
    addPayment(p: NewPayment): Promise<Payment>;
  };
  announcements: {
    list(): Promise<Announcement[]>;
    create(a: NewAnnouncement): Promise<Announcement>;
  };
}

export type { Invoice };
