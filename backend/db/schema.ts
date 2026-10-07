import {
  pgTable, serial, text, integer, date, timestamp, pgEnum, uniqueIndex, index,
} from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['F', 'M']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'telebirr', 'cbe_birr', 'bank']);

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  grade: text('grade').notNull(),            // 'KG2', '1' … '12'
  section: text('section').notNull(),        // 'A', 'B'
  homeroomTeacher: text('homeroom_teacher').notNull(),
});

// Ethiopian naming: given name + father's name + grandfather's name
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  fatherName: text('father_name').notNull(),
  grandfatherName: text('grandfather_name').notNull(),
  gender: genderEnum('gender').notNull(),
  classId: integer('class_id').notNull().references(() => classes.id),
  guardianName: text('guardian_name').notNull(),
  guardianPhone: text('guardian_phone').notNull(),
  enrolledAt: timestamp('enrolled_at', { mode: 'string' }).defaultNow().notNull(),
}, (t) => [index('students_class_idx').on(t.classId)]);

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  date: date('date', { mode: 'string' }).notNull(),
  status: attendanceStatusEnum('status').notNull(),
}, (t) => [
  uniqueIndex('attendance_student_date_uq').on(t.studentId, t.date),
  index('attendance_date_idx').on(t.date),
]);

// Money is stored in santim (1 birr = 100 santim) to avoid floating-point errors
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  term: text('term').notNull(),
  description: text('description').notNull(),
  amountSantim: integer('amount_santim').notNull(),
  dueDate: date('due_date', { mode: 'string' }).notNull(),
}, (t) => [index('invoices_student_idx').on(t.studentId)]);

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  amountSantim: integer('amount_santim').notNull(),
  method: paymentMethodEnum('method').notNull(),
  reference: text('reference'),
  paidAt: timestamp('paid_at', { mode: 'string' }).defaultNow().notNull(),
}, (t) => [index('payments_invoice_idx').on(t.invoiceId)]);

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});
