import { seededRandom, addDays } from '../domain/fp.js';
import type { SchoolClass, Student, AttendanceRecord, Invoice, Payment, AttendanceStatus, PaymentMethod } from '../domain/types.js';

const FEMALE = ['Hana', 'Meron', 'Selam', 'Bethlehem', 'Liya', 'Mahlet', 'Saron', 'Tigist', 'Rahel', 'Eden', 'Hiwot', 'Kidist', 'Feven', 'Yordanos', 'Lidya', 'Ruth'];
const MALE = ['Abel', 'Dawit', 'Yonas', 'Natnael', 'Bereket', 'Kaleb', 'Samuel', 'Henok', 'Mikias', 'Biruk', 'Eyob', 'Nahom', 'Robel', 'Yared', 'Amanuel', 'Fitsum'];
const FATHERS = ['Tesfaye', 'Girma', 'Bekele', 'Alemu', 'Haile', 'Mengistu', 'Tadesse', 'Kebede', 'Wolde', 'Getachew', 'Assefa', 'Desta', 'Negash', 'Abebe', 'Mulugeta', 'Yohannes'];
const TEACHERS = ['Ato Solomon Desta', 'W/ro Almaz Kebede', 'Ato Tewodros Haile', 'W/ro Senait Girma', 'Ato Mesfin Alemu', 'W/ro Martha Bekele'];
const GRADES = ['KG2', '1', '2', '3', '4', '5', '6', '7', '8'];
const METHODS: PaymentMethod[] = ['cash', 'telebirr', 'telebirr', 'cbe_birr', 'bank'];

export interface SeedData {
  classes: SchoolClass[]; students: Student[]; attendance: AttendanceRecord[]; invoices: Invoice[]; payments: Payment[];
}

/** Pure, deterministic generator: the same seed always produces the same school. */
export const generateSeed = (today: string, seed = 42): SeedData => {
  const rand = seededRandom(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;

  const classes: SchoolClass[] = GRADES.flatMap((grade, gi) =>
    ['A', 'B'].map((section, si) => ({ id: gi * 2 + si + 1, grade, section, homeroomTeacher: pick(TEACHERS) })));

  let studentId = 0;
  const students: Student[] = classes.flatMap((c) =>
    Array.from({ length: 18 + Math.floor(rand() * 8) }, () => {
      const gender = rand() < 0.5 ? 'F' : 'M';
      const fatherName = pick(FATHERS);
      const grandfatherName = pick(FATHERS);
      return {
        id: ++studentId,
        firstName: pick(gender === 'F' ? FEMALE : MALE),
        fatherName, grandfatherName, gender, classId: c.id,
        guardianName: `${fatherName} ${grandfatherName}`,
        guardianPhone: `+2519${String(Math.floor(10_000_000 + rand() * 89_999_999))}`,
        enrolledAt: `${addDays(today, -60)}T08:00:00.000Z`,
      } satisfies Student;
    }));

  // Last 20 school days (Mon–Fri). A few students are frequently absent.
  const schoolDays = Array.from({ length: 28 }, (_, i) => addDays(today, -i - 1))
    .filter((d) => { const wd = new Date(`${d}T00:00:00Z`).getUTCDay(); return wd !== 0 && wd !== 6; })
    .slice(0, 20);
  const absentProne = new Set(students.filter(() => rand() < 0.06).map((s) => s.id));
  const attendance: AttendanceRecord[] = students.flatMap((s) => schoolDays.map((date) => {
    const r = rand();
    const absentChance = absentProne.has(s.id) ? 0.35 : 0.04;
    const status: AttendanceStatus = r < absentChance ? 'absent' : r < absentChance + 0.06 ? 'late' : 'present';
    return { studentId: s.id, date, status };
  }));

  // One tuition invoice per student for the term; fee depends on grade band.
  const feeFor = (classId: number): number => (classId <= 2 ? 3_500_00 : classId <= 10 ? 4_800_00 : 6_200_00);
  const invoices: Invoice[] = students.map((s, i) => ({
    id: i + 1, studentId: s.id, term: 'Term 1, 2026/27', description: 'Tuition fee',
    amountSantim: feeFor(s.classId), dueDate: addDays(today, -10),
  }));

  let paymentId = 0;
  const payments: Payment[] = invoices.flatMap((inv) => {
    const r = rand();
    const method = pick(METHODS);
    const paidAt = `${addDays(today, -15)}T10:00:00.000Z`;
    if (r < 0.65) return [{ id: ++paymentId, invoiceId: inv.id, amountSantim: inv.amountSantim, method, reference: null, paidAt }];
    if (r < 0.85) return [{ id: ++paymentId, invoiceId: inv.id, amountSantim: Math.round(inv.amountSantim / 2), method, reference: null, paidAt }];
    return [];
  });

  return { classes, students, attendance, invoices, payments };
};
