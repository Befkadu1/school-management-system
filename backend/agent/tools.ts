import { z } from 'zod';
import type { Repos } from '../repositories/types.js';
import type { SchoolClass, Student } from '../domain/types.js';
import { toInvoiceView, formatBirr } from '../domain/fees.js';
import { findAtRisk, summarize } from '../domain/attendance.js';
import { addDays } from '../domain/fp.js';
import type { ToolSpec } from './llm.js';

export interface ToolContext { repos: Repos; today: string }

export interface AgentTool<I = any> {
  name: string;
  description: string;
  schema: z.ZodType<I>;
  /** 'read' tools only look at data; 'draft' tools prepare something a human must approve. */
  kind: 'read' | 'draft';
  run(input: I, ctx: ToolContext): Promise<unknown>;
}

const defineTool = <I>(tool: AgentTool<I>): AgentTool<I> => tool;

const className = (c: SchoolClass | undefined) =>
  (c ? (c.grade.startsWith('KG') ? `${c.grade}${c.section}` : `Grade ${c.grade}${c.section}`) : 'Unknown class');
const fullName = (s: Student) => `${s.firstName} ${s.fatherName} ${s.grandfatherName}`;
const classIndex = async (repos: Repos) => new Map((await repos.classes.list()).map((c) => [c.id, c]));

export const tools: AgentTool[] = [
  defineTool({
    name: 'list_classes',
    description: 'List all classes with their id, grade, section, homeroom teacher and number of students.',
    kind: 'read',
    schema: z.object({}),
    async run(_input, { repos }) {
      const classes = await repos.classes.list();
      return Promise.all(classes.map(async (c) => ({
        id: c.id, name: className(c), homeroomTeacher: c.homeroomTeacher,
        students: (await repos.students.list({ classId: c.id, limit: 0 })).total,
      })));
    },
  }),
  defineTool({
    name: 'search_students',
    description: 'Find students by part of their name, optionally within one class. Returns at most 10 matches.',
    kind: 'read',
    schema: z.object({ query: z.string().min(1), classId: z.number().int().optional() }),
    async run({ query, classId }, { repos }) {
      const [classes, { items, total }] = await Promise.all([classIndex(repos), repos.students.list({ search: query, classId, limit: 10 })]);
      return { total, students: items.map((s) => ({ id: s.id, name: fullName(s), class: className(classes.get(s.classId)), guardianPhone: s.guardianPhone })) };
    },
  }),
  defineTool({
    name: 'get_student_profile',
    description: 'Full profile of one student: class, guardian, attendance over the last 30 days and fee balance.',
    kind: 'read',
    schema: z.object({ studentId: z.number().int() }),
    async run({ studentId }, { repos, today }) {
      const student = await repos.students.get(studentId);
      if (!student) throw new Error(`No student with id ${studentId}`);
      const [classes, records, invoices] = await Promise.all([
        classIndex(repos), repos.attendance.since(addDays(today, -30), studentId), repos.fees.invoices({ studentId }),
      ]);
      const views = invoices.map(toInvoiceView(today));
      const summary = summarize(records);
      return {
        name: fullName(student), class: className(classes.get(student.classId)),
        guardian: { name: student.guardianName, phone: student.guardianPhone },
        attendanceLast30Days: { ...summary, rate: `${Math.round(summary.rate * 100)}%` },
        fees: views.map((v) => ({ term: v.term, description: v.description, amount: formatBirr(v.amountSantim), paid: formatBirr(v.paidSantim), balance: formatBirr(v.balanceSantim), status: v.status })),
      };
    },
  }),
  defineTool({
    name: 'list_unpaid_fees',
    description: 'Students with an outstanding fee balance, largest balance first, plus the school-wide total. Optionally filter by class or overdue only.',
    kind: 'read',
    schema: z.object({ classId: z.number().int().optional(), overdueOnly: z.boolean().optional(), limit: z.number().int().min(1).max(50).optional() }),
    async run({ classId, overdueOnly = false, limit = 15 }, { repos, today }) {
      const [classes, invoices, { items: students }] = await Promise.all([
        classIndex(repos), repos.fees.invoices(), repos.students.list({ classId, limit: 100_000 }),
      ]);
      const byId = new Map(students.map((s) => [s.id, s]));
      const open = invoices.map(toInvoiceView(today))
        .filter((v) => byId.has(v.studentId) && v.balanceSantim > 0 && (!overdueOnly || v.status === 'overdue'))
        .sort((a, b) => b.balanceSantim - a.balanceSantim);
      const total = open.reduce((s, v) => s + v.balanceSantim, 0);
      return {
        count: open.length, totalOutstanding: formatBirr(total),
        students: open.slice(0, limit).map((v) => {
          const s = byId.get(v.studentId)!;
          return { studentId: s.id, name: fullName(s), class: className(classes.get(s.classId)), balance: formatBirr(v.balanceSantim), status: v.status, guardianPhone: s.guardianPhone };
        }),
      };
    },
  }),
  defineTool({
    name: 'find_attendance_risks',
    description: 'Students whose attendance rate over the last N days is below a threshold (default 85% over 20 days), worst first.',
    kind: 'read',
    schema: z.object({ days: z.number().int().min(5).max(90).optional(), threshold: z.number().min(0.1).max(1).optional(), classId: z.number().int().optional() }),
    async run({ days = 20, threshold = 0.85, classId }, { repos, today }) {
      const [classes, records, { items: students }] = await Promise.all([
        classIndex(repos), repos.attendance.since(addDays(today, -days)), repos.students.list({ classId, limit: 100_000 }),
      ]);
      const byId = new Map(students.map((s) => [s.id, s]));
      const risks = findAtRisk(records.filter((r) => byId.has(r.studentId)), threshold);
      return {
        threshold: `${Math.round(threshold * 100)}%`, days, count: risks.length,
        students: risks.slice(0, 20).map(({ studentId, summary }) => {
          const s = byId.get(studentId)!;
          return { studentId, name: fullName(s), class: className(classes.get(s.classId)), rate: `${Math.round(summary.rate * 100)}%`, absent: summary.absent, guardianPhone: s.guardianPhone };
        }),
      };
    },
  }),
  defineTool({
    name: 'draft_announcement',
    description: 'Prepare an announcement for parents or staff. It is NOT sent: a school administrator reviews and publishes it. Write it in plain, polite language; include Amharic if the user asks.',
    kind: 'draft',
    schema: z.object({ title: z.string().min(3), body: z.string().min(10), audience: z.string().min(1) }),
    run: async (draft) => ({ draft, requiresApproval: true }),
  }),
];

export const toToolSpecs = (list: AgentTool[]): ToolSpec[] =>
  list.map((t) => {
    const { $schema: _ignored, ...input_schema } = z.toJSONSchema(t.schema) as Record<string, unknown>;
    return { name: t.name, description: t.description, input_schema };
  });
