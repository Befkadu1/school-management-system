import express, { type ErrorRequestHandler, type Request } from 'express';
import cors from 'cors';
import { z } from 'zod';
import type { Repos } from '../repositories/types.js';
import { createCommandBus, CommandError, type Middleware } from '../commands/bus.js';
import { createStudent, recordAttendance, recordPayment, publishAnnouncement } from '../commands/commands.js';
import { toInvoiceView } from '../domain/fees.js';
import { summarize } from '../domain/attendance.js';
import { isoDate, memoizeAsync } from '../domain/fp.js';
import { runAgent } from '../agent/agent.js';
import { tools } from '../agent/tools.js';
import type { LlmClient } from '../agent/llm.js';

export interface AppDeps {
  repos: Repos;
  llm: LlmClient;
  today?: () => string;
  commandMiddleware?: Middleware[];
}

const int = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v));

/** App factory: dependencies are passed in, so tests can build an app with fakes. */
export const createApp = ({ repos, llm, today = () => isoDate(new Date()), commandMiddleware }: AppDeps) => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '200kb' }));

  const bus = createCommandBus(() => ({ repos, today: today() }), commandMiddleware);

  // Performance: the dashboard aggregates every invoice, so cache it briefly.
  const dashboard = memoizeAsync(async (day: string) => {
    const [{ total: students }, classes, invoices, todayRecords] = await Promise.all([
      repos.students.list({ limit: 0 }), repos.classes.list(), repos.fees.invoices(), repos.attendance.since(day),
    ]);
    const views = invoices.map(toInvoiceView(day));
    return {
      students, classes: classes.length,
      attendanceToday: summarize(todayRecords.filter((r) => r.date === day)),
      outstandingSantim: views.reduce((s, v) => s + v.balanceSantim, 0),
      overdueInvoices: views.filter((v) => v.status === 'overdue').length,
    };
  }, 10_000);
  const invalidate = () => dashboard.clear();

  app.get('/api/health', (_req, res) => { res.json({ ok: true, model: llm.name }); });
  app.get('/api/dashboard', async (_req, res) => { res.json(await dashboard(today())); });
  app.get('/api/classes', async (_req, res) => { res.json(await repos.classes.list()); });

  app.get('/api/students', async (req: Request, res) => {
    const { classId, search, limit, offset } = req.query;
    res.json(await repos.students.list({
      classId: int(classId), search: typeof search === 'string' ? search : undefined,
      limit: Math.min(int(limit) ?? 50, 500), offset: int(offset) ?? 0,
    }));
  });
  app.post('/api/students', async (req, res) => {
    const student = await bus.dispatch(createStudent, req.body);
    invalidate();
    res.status(201).json(student);
  });

  app.get('/api/attendance', async (req, res) => {
    const classId = int(req.query.classId);
    const date = typeof req.query.date === 'string' ? req.query.date : today();
    if (!classId) throw new CommandError('classId is required');
    res.json(await repos.attendance.forClassOnDate(classId, date));
  });
  app.put('/api/attendance', async (req, res) => {
    const result = await bus.dispatch(recordAttendance, req.body);
    invalidate();
    res.json(result);
  });

  app.get('/api/fees/invoices', async (req, res) => {
    const invoices = await repos.fees.invoices({ studentId: int(req.query.studentId) });
    res.json(invoices.map(toInvoiceView(today())));
  });
  app.post('/api/fees/payments', async (req, res) => {
    const payment = await bus.dispatch(recordPayment, req.body);
    invalidate();
    res.status(201).json(payment);
  });

  app.get('/api/announcements', async (_req, res) => { res.json(await repos.announcements.list()); });
  app.post('/api/announcements', async (req, res) => {
    res.status(201).json(await bus.dispatch(publishAnnouncement, req.body));
  });

  const chatSchema = z.object({
    message: z.string().trim().min(1).max(2000),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })).max(20).default([]),
  });
  app.post('/api/assistant', async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) throw new CommandError('message is required');
    res.json(await runAgent({ llm, tools, ctx: { repos, today: today() }, ...parsed.data }));
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof CommandError) { res.status(err.status).json({ error: err.message }); return; }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  };
  app.use(onError);
  return app;
};
