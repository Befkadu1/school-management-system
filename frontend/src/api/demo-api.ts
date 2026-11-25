/**
 * Demo mode: an in-memory stand-in for the Express API, so the static build
 * (GitHub Pages, `VITE_DEMO=true`) works with no server. school-api.ts selects
 * it at build time, so normal builds never include this module.
 *
 * Writes update the in-memory data for the rest of the page session. A reload
 * starts again from the same sample school.
 */
import { HttpError } from './http';
import type { SchoolApi } from './school-api';
import type {
  AgentResult, AttendanceRecord, AttendanceStatus, Dashboard, InvoiceStatus, InvoiceView, Payment,
  PaymentMethod, SchoolClass, Student,
} from './types';

const DEMO_MODEL = 'demo (offline)';

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const isWeekday = (iso: string) => {
  const wd = new Date(`${iso}T00:00:00`).getDay();
  return wd !== 0 && wd !== 6;
};
const birr = (santim: number) => `${(santim / 100).toLocaleString('en-US')} Birr`;

const CLASSES: SchoolClass[] = [
  { id: 1, grade: '3', section: 'A', homeroomTeacher: 'W/ro Almaz Kebede' },
  { id: 2, grade: '3', section: 'B', homeroomTeacher: 'Ato Solomon Desta' },
  { id: 3, grade: '4', section: 'A', homeroomTeacher: 'W/ro Senait Girma' },
];
const FIRST_F = ['Hana', 'Meron', 'Selam', 'Liya', 'Rahel', 'Eden', 'Tigist', 'Saron'];
const FIRST_M = ['Abel', 'Dawit', 'Yonas', 'Kaleb', 'Samuel', 'Henok', 'Biruk', 'Natnael'];
const FATHERS = ['Tesfaye', 'Girma', 'Bekele', 'Alemu', 'Haile', 'Mengistu', 'Tadesse', 'Kebede'];
const PAST_SCHOOL_DAYS = 5;

const fullName = (s: Student) => `${s.firstName} ${s.fatherName} ${s.grandfatherName}`.toLowerCase();

/** Builds a fresh sample school, with dates relative to the current day. */
const buildSampleData = (now: Date) => {
  const today = isoDate(now);
  const students: Student[] = CLASSES.flatMap((c, ci) =>
    Array.from({ length: 8 }, (_, i) => {
      const id = ci * 8 + i + 1;
      const gender: 'F' | 'M' = i % 2 === 0 ? 'F' : 'M';
      const fatherName = FATHERS[(i * 3 + ci) % FATHERS.length]!;
      const grandfatherName = FATHERS[(i + 5) % FATHERS.length]!;
      return {
        id, gender, classId: c.id,
        firstName: (gender === 'F' ? FIRST_F : FIRST_M)[(i + ci) % 8]!,
        fatherName, grandfatherName,
        guardianName: `${fatherName} ${grandfatherName}`,
        guardianPhone: `+251911${String(100_000 + id).padStart(6, '0')}`,
        enrolledAt: `${addDays(today, -60)}T08:00:00.000Z`,
      };
    }));

  // Deterministic pattern: most students present, a few late or absent.
  const statusFor = (studentId: number, dayIndex: number): AttendanceStatus => {
    const k = (studentId * 7 + dayIndex * 3) % 12;
    return k === 0 ? 'absent' : k === 1 ? 'late' : 'present';
  };
  const attendance = new Map<string, AttendanceStatus>();
  const pastDays: string[] = [];
  for (let n = 1; pastDays.length < PAST_SCHOOL_DAYS; n++) {
    const d = addDays(today, -n);
    if (isWeekday(d)) pastDays.unshift(d);
  }
  pastDays.forEach((date, di) => students.forEach((s) => attendance.set(`${date}|${s.id}`, statusFor(s.id, di))));

  // One tuition invoice per student, due ten days ago. Some are paid, some half paid, some unpaid.
  const dueDate = addDays(today, -10);
  const invoices = students.map((s) => ({
    id: s.id, studentId: s.id, term: 'Term 1, 2026/27', description: 'Tuition fee',
    amountSantim: s.classId === 3 ? 4_800_00 : 3_500_00, dueDate, payments: [] as Payment[],
  }));
  let paymentId = 0;
  const paidAt = `${addDays(today, -15)}T10:00:00.000Z`;
  invoices.forEach((inv) => {
    const mode = inv.studentId % 3;
    if (mode === 2) return;
    const amountSantim = mode === 0 ? inv.amountSantim : Math.round(inv.amountSantim / 2);
    inv.payments.push({ id: ++paymentId, invoiceId: inv.id, amountSantim, method: 'telebirr', reference: null, paidAt });
  });

  return { today, students, attendance, invoices, paymentId };
};

type Invoice = ReturnType<typeof buildSampleData>['invoices'][number];

/** Same status rules as the backend's fee domain. */
const toView = (today: string) => (inv: Invoice): InvoiceView => {
  const paidSantim = inv.payments.reduce((sum, p) => sum + p.amountSantim, 0);
  const balanceSantim = Math.max(0, inv.amountSantim - paidSantim);
  const status: InvoiceStatus = balanceSantim === 0
    ? 'paid'
    : inv.dueDate < today ? 'overdue' : paidSantim > 0 ? 'partial' : 'unpaid';
  return { ...inv, paidSantim, balanceSantim, status };
};

const summarize = (records: AttendanceRecord[]) => {
  const count = (status: AttendanceStatus) => records.filter((r) => r.status === status).length;
  const present = count('present');
  const late = count('late');
  const absent = count('absent');
  const total = records.length;
  return { present, late, absent, total, rate: total === 0 ? 1 : (present + late) / total };
};

/** Creates a fresh in-memory school. Same method names and shapes as the real API client. */
export const createDemoApi = (now: Date = new Date()): SchoolApi => {
  const data = buildSampleData(now);
  const { today, students, attendance, invoices } = data;
  let nextPaymentId = data.paymentId + 1;
  const announcements: { id: number }[] = [];
  const viewOf = toView(today);

  const attendanceRecords = (date: string): AttendanceRecord[] =>
    students.flatMap((s) => {
      const status = attendance.get(`${date}|${s.id}`);
      return status ? [{ studentId: s.id, date, status }] : [];
    });

  const scriptedAnswer = (message: string): AgentResult => {
    const text = message.toLowerCase();
    if (/fee|unpaid|owe|balance|payment/.test(text)) {
      const owing = invoices.map(viewOf).filter((v) => v.balanceSantim > 0);
      const total = owing.reduce((sum, v) => sum + v.balanceSantim, 0);
      const body = `Dear parents, ${owing.length} students still have an unpaid Term 1 balance of ${birr(total)} in total. Please settle it at the school office. Thank you.`;
      return {
        model: DEMO_MODEL,
        answer: `${owing.length} students have an unpaid balance of ${birr(total)}. I drafted a fee reminder for parents. Review it below.`,
        steps: [
          { tool: 'list_unpaid_fees', input: {}, ok: true, output: { count: owing.length, totalSantim: total }, ms: 3 },
          { tool: 'draft_announcement', input: { audience: 'Parents' }, ok: true, output: {}, ms: 1 },
        ],
        drafts: [{ title: 'Reminder: Term 1 school fees', body, audience: 'Parents' }],
      };
    }
    if (/attend|absent|late/.test(text)) {
      const s = summarize(attendanceRecords(today));
      const pct = Math.round(s.rate * 100);
      return {
        model: DEMO_MODEL,
        answer: `Today's attendance rate is ${pct}% (${s.absent} absent, ${s.late} late). Full attendance is recorded on the Attendance page.`,
        steps: [{ tool: 'summarize_attendance', input: { date: today }, ok: true, output: s, ms: 2 }],
        drafts: [],
      };
    }
    return {
      model: DEMO_MODEL,
      answer: 'This is the offline demo assistant, so it answers a few scripted questions. Try "Who has unpaid fees?" or "How is attendance today?"',
      steps: [],
      drafts: [],
    };
  };

  return {
    health: async () => ({ ok: true, model: DEMO_MODEL }),
    dashboard: async (): Promise<Dashboard> => {
      const views = invoices.map(viewOf);
      return {
        students: students.length,
        classes: CLASSES.length,
        outstandingSantim: views.reduce((sum, v) => sum + v.balanceSantim, 0),
        overdueInvoices: views.filter((v) => v.status === 'overdue').length,
        attendanceToday: summarize(attendanceRecords(today)),
      };
    },
    classes: async () => CLASSES,
    students: async (q) => {
      const term = (q.search ?? '').trim().toLowerCase();
      const matches = students.filter((s) =>
        (q.classId === undefined || s.classId === q.classId) && (!term || fullName(s).includes(term)));
      const offset = q.offset ?? 0;
      return { items: matches.slice(offset, offset + (q.limit ?? 50)), total: matches.length };
    },
    createStudent: async (s) => {
      if (!CLASSES.some((c) => c.id === s.classId)) throw new HttpError(404, 'Class not found');
      if (!s.firstName.trim() || !s.fatherName.trim() || !s.grandfatherName.trim() || !s.guardianName.trim()) {
        throw new HttpError(400, 'Names are required');
      }
      if (!/^\+?\d{9,13}$/.test(s.guardianPhone.trim())) throw new HttpError(400, 'Expected a phone number like +251911234567');
      const id = Math.max(0, ...students.map((x) => x.id)) + 1;
      const student: Student = { ...s, id, enrolledAt: new Date().toISOString() };
      students.push(student);
      return student;
    },
    attendance: async (classId, date) => attendanceRecords(date).filter((r) =>
      students.some((s) => s.id === r.studentId && s.classId === classId)),
    saveAttendance: async (date, records) => {
      if (date > today) throw new HttpError(400, 'Attendance cannot be recorded for a future date');
      records.forEach((r) => attendance.set(`${date}|${r.studentId}`, r.status));
      return { saved: records.length };
    },
    invoices: async () => invoices.map(viewOf),
    recordPayment: async ({ invoiceId, amountSantim, method, reference }) => {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (!inv) throw new HttpError(404, 'Invoice not found');
      if (!Number.isInteger(amountSantim) || amountSantim <= 0) {
        throw new HttpError(400, 'Amount must be a positive whole number of santim');
      }
      const view = viewOf(inv);
      if (view.balanceSantim === 0) throw new HttpError(400, 'This invoice is already fully paid');
      if (amountSantim > view.balanceSantim) {
        throw new HttpError(400, `Amount exceeds the remaining balance of ${birr(view.balanceSantim)}`);
      }
      const payment: Payment = {
        id: nextPaymentId++, invoiceId, amountSantim, method: method as PaymentMethod,
        reference: reference ?? null, paidAt: new Date().toISOString(),
      };
      inv.payments.push(payment);
      return payment;
    },
    ask: async (message) => scriptedAnswer(message),
    publishAnnouncement: async (d) => {
      const record = { id: announcements.length + 1, ...d };
      announcements.push(record);
      return { id: record.id };
    },
  };
};
