// Plain domain types shared by repositories, commands, agent tools and HTTP.
export type Gender = 'F' | 'M';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type PaymentMethod = 'cash' | 'telebirr' | 'cbe_birr' | 'bank';

export interface SchoolClass { id: number; grade: string; section: string; homeroomTeacher: string }

export interface Student {
  id: number; firstName: string; fatherName: string; grandfatherName: string;
  gender: Gender; classId: number; guardianName: string; guardianPhone: string; enrolledAt: string;
}
export type NewStudent = Omit<Student, 'id' | 'enrolledAt'>;

export interface AttendanceRecord { studentId: number; date: string; status: AttendanceStatus }

export interface Invoice { id: number; studentId: number; term: string; description: string; amountSantim: number; dueDate: string }
export interface Payment { id: number; invoiceId: number; amountSantim: number; method: PaymentMethod; reference: string | null; paidAt: string }
export type NewPayment = Omit<Payment, 'id' | 'paidAt'>;

export interface Announcement { id: number; title: string; body: string; audience: string; createdAt: string }
export type NewAnnouncement = Omit<Announcement, 'id' | 'createdAt'>;

export interface InvoiceWithPayments extends Invoice { payments: readonly Payment[] }
