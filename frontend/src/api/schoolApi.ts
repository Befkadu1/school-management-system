import { createHttpClient, type HttpClient } from './http';
import type {
  AgentDraft, AgentResult, AttendanceRecord, AttendanceStatus, ChatTurn, Dashboard, InvoiceView,
  NewStudent, Payment, PaymentMethod, SchoolClass, Student,
} from './types';

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

/** All endpoints in one place; components never call fetch directly. */
export const createSchoolApi = (http: HttpClient) => ({
  dashboard: () => http.get<Dashboard>('/api/dashboard'),
  classes: () => http.get<SchoolClass[]>('/api/classes'),
  students: (q: { search?: string; classId?: number; limit?: number; offset?: number }) =>
    http.get<{ items: Student[]; total: number }>(`/api/students${qs(q)}`),
  createStudent: (s: NewStudent) => http.post<Student>('/api/students', s),
  attendance: (classId: number, date: string) => http.get<AttendanceRecord[]>(`/api/attendance${qs({ classId, date })}`),
  saveAttendance: (date: string, records: { studentId: number; status: AttendanceStatus }[]) =>
    http.put<{ saved: number }>('/api/attendance', { date, records }),
  invoices: () => http.get<InvoiceView[]>('/api/fees/invoices'),
  recordPayment: (p: { invoiceId: number; amountSantim: number; method: PaymentMethod; reference: string | null }) =>
    http.post<Payment>('/api/fees/payments', p),
  ask: (message: string, history: ChatTurn[]) => http.post<AgentResult>('/api/assistant', { message, history }),
  publishAnnouncement: (d: AgentDraft) => http.post<{ id: number }>('/api/announcements', d),
});

export type SchoolApi = ReturnType<typeof createSchoolApi>;

export const schoolApi: SchoolApi = createSchoolApi(createHttpClient());
