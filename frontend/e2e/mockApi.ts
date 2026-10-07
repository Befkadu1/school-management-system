import type { Page } from '@playwright/test';

const today = new Date().toISOString().slice(0, 10);
const student = (id: number, firstName: string, fatherName: string) => ({
  id, firstName, fatherName, grandfatherName: 'Haile', gender: 'F', classId: 1,
  guardianName: `${fatherName} Haile`, guardianPhone: '+251911000000', enrolledAt: today,
});

/** Fakes the backend inside the browser so E2E tests are fast and deterministic. */
export const mockApi = async (page: Page) => {
  if (process.env.E2E_REAL_API) return { saved: [] as unknown[], published: [] as unknown[], payments: [] as unknown[] };
  const students = [student(1, 'Hana', 'Tesfaye'), student(2, 'Abel', 'Girma'), student(3, 'Meron', 'Bekele')];
  const saved: unknown[] = [];
  const published: unknown[] = [];
  const payments: unknown[] = [];
  const invoices = [{
    id: 10, studentId: 1, term: '1', description: 'Term 1 tuition', amountSantim: 500_000,
    dueDate: today, payments: [], paidSantim: 200_000, balanceSantim: 300_000, status: 'partial',
  }];

  // Match on the path prefix: a '**/api/**' glob would also catch Vite's own /src/api/*.ts modules
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    switch (`${req.method()} ${url.pathname}`) {
      case 'GET /api/health': return json({ ok: true, model: 'mock' });
      case 'GET /api/classes': return json([{ id: 1, grade: '3', section: 'A', homeroomTeacher: 'W/ro Almaz Kebede' }]);
      case 'GET /api/students': {
        const q = (url.searchParams.get('search') ?? '').toLowerCase();
        const items = students.filter((s) => `${s.firstName} ${s.fatherName}`.toLowerCase().includes(q));
        return json({ items, total: items.length });
      }
      case 'GET /api/attendance': return json([]);
      case 'PUT /api/attendance': saved.push(req.postDataJSON()); return json({ saved: 3 });
      case 'GET /api/dashboard': return json({ students: 3, classes: 1, outstandingSantim: 480000, overdueInvoices: 1, attendanceToday: { present: 0, late: 0, absent: 0, total: 0, rate: 1 } });
      case 'POST /api/assistant': return json({
        model: 'mock',
        answer: 'I drafted a fee reminder for parents. Review it below.',
        steps: [{ tool: 'list_unpaid_fees', input: {}, ok: true, output: {}, ms: 4 }, { tool: 'draft_announcement', input: {}, ok: true, output: {}, ms: 1 }],
        drafts: [{ title: 'Reminder: Term 1 school fees', body: 'Dear parents, Term 1 fees are due.', audience: 'Parents' }],
      });
      case 'GET /api/fees/invoices': return json(invoices);
      case 'POST /api/fees/payments': {
        const body = req.postDataJSON() as { amountSantim: number };
        payments.push(body);
        // Reflect the payment, the way the real API does, so the page refetches a changed invoice
        const invoice = invoices[0]!;
        invoice.paidSantim += body.amountSantim;
        invoice.balanceSantim -= body.amountSantim;
        invoice.status = invoice.balanceSantim === 0 ? 'paid' : 'partial';
        return json({ id: 1, invoiceId: invoice.id, ...body, paidAt: today }, 201);
      }
      case 'POST /api/announcements': published.push(req.postDataJSON()); return json({ id: 1 }, 201);
      default: return json({ error: `No mock for ${req.method()} ${url.pathname}` }, 404);
    }
  });
  return { saved, published, payments };
};
