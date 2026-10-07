import { z } from 'zod';
import { CommandError, type Command } from './bus.js';
import { validatePayment } from '../domain/fees.js';
import type { AttendanceRecord, NewAnnouncement, NewStudent, Payment, Student, Announcement } from '../domain/types.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const createStudent: Command<NewStudent, Student> = {
  name: 'CreateStudent',
  schema: z.object({
    firstName: z.string().trim().min(1),
    fatherName: z.string().trim().min(1),
    grandfatherName: z.string().trim().min(1),
    gender: z.enum(['F', 'M']),
    classId: z.number().int().positive(),
    guardianName: z.string().trim().min(1),
    guardianPhone: z.string().trim().regex(/^\+?\d{9,13}$/, 'expected a phone number like +251911234567'),
  }),
  async execute(input, { repos }) {
    const classes = await repos.classes.list();
    if (!classes.some((c) => c.id === input.classId)) throw new CommandError('Class not found', 404);
    return repos.students.create(input);
  },
};

export interface RecordAttendanceInput { date: string; records: { studentId: number; status: AttendanceRecord['status'] }[] }

export const recordAttendance: Command<RecordAttendanceInput, { saved: number }> = {
  name: 'RecordAttendance',
  schema: z.object({
    date: isoDate,
    records: z.array(z.object({ studentId: z.number().int().positive(), status: z.enum(['present', 'absent', 'late']) })).min(1),
  }),
  async execute({ date, records }, { repos, today }) {
    if (date > today) throw new CommandError('Attendance cannot be recorded for a future date');
    const saved = await repos.attendance.upsertMany(records.map((r) => ({ ...r, date })));
    return { saved };
  },
};

export const recordPayment: Command<Omit<Payment, 'id' | 'paidAt'>, Payment> = {
  name: 'RecordPayment',
  schema: z.object({
    invoiceId: z.number().int().positive(),
    amountSantim: z.number().int().positive(),
    method: z.enum(['cash', 'telebirr', 'cbe_birr', 'bank']),
    reference: z.string().trim().max(64).nullable().default(null),
  }),
  async execute(input, { repos }) {
    const invoice = await repos.fees.invoice(input.invoiceId);
    if (!invoice) throw new CommandError('Invoice not found', 404);
    const error = validatePayment(invoice, input.amountSantim);
    if (error) throw new CommandError(error);
    return repos.fees.addPayment(input);
  },
};

export const publishAnnouncement: Command<NewAnnouncement, Announcement> = {
  name: 'PublishAnnouncement',
  schema: z.object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(2000),
    audience: z.string().trim().min(1),
  }),
  execute: (input, { repos }) => repos.announcements.create(input),
};
