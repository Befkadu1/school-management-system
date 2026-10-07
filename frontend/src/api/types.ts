export type AttendanceStatus = 'present' | 'absent' | 'late';
export type PaymentMethod = 'cash' | 'telebirr' | 'cbe_birr' | 'bank';
export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export interface SchoolClass { id: number; grade: string; section: string; homeroomTeacher: string }
export interface Student {
  id: number; firstName: string; fatherName: string; grandfatherName: string; gender: 'F' | 'M';
  classId: number; guardianName: string; guardianPhone: string; enrolledAt: string;
}
export type NewStudent = Omit<Student, 'id' | 'enrolledAt'>;
export interface AttendanceRecord { studentId: number; date: string; status: AttendanceStatus }
export interface Payment { id: number; invoiceId: number; amountSantim: number; method: PaymentMethod; reference: string | null; paidAt: string }
export interface InvoiceView {
  id: number; studentId: number; term: string; description: string; amountSantim: number; dueDate: string;
  payments: Payment[]; paidSantim: number; balanceSantim: number; status: InvoiceStatus;
}
export interface Dashboard {
  students: number; classes: number; outstandingSantim: number; overdueInvoices: number;
  attendanceToday: { present: number; late: number; absent: number; total: number; rate: number };
}
export interface AgentStep { tool: string; input: unknown; ok: boolean; output: unknown; ms: number }
export interface AgentDraft { title: string; body: string; audience: string }
export interface AgentResult { answer: string; steps: AgentStep[]; drafts: AgentDraft[]; model: string }
export interface ChatTurn { role: 'user' | 'assistant'; text: string }
