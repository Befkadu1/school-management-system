import type { LlmClient, LlmRequest, LlmResponse, ToolUseBlock } from './llm.js';

/**
 * A rule-based stand-in for a real model. It picks one tool by keyword, then
 * summarizes the result. Useful offline, in tests, and to see the agent loop
 * without spending API credits. It is intentionally simple.
 */
export class ScriptedLlm implements LlmClient {
  readonly name = 'offline-demo';
  private counter = 0;

  async complete({ messages }: LlmRequest): Promise<LlmResponse> {
    const last = messages.at(-1);
    if (last?.role === 'user' && Array.isArray(last.content)) {
      const prev = messages.at(-2);
      const call = prev?.role === 'assistant' ? prev.content.find((b): b is ToolUseBlock => b.type === 'tool_use') : undefined;
      const result = last.content[0];
      const text = result?.is_error ? `That lookup failed: ${result.content}` : summarize(call?.name ?? '', JSON.parse(result?.content ?? '{}'));
      return { content: [{ type: 'text', text: `${text}\n\n(Offline demo model. Set ANTHROPIC_API_KEY to use Claude.)` }], stopReason: 'end_turn' };
    }
    const question = typeof last?.content === 'string' ? last.content : '';
    const [name, input] = route(question);
    return { content: [{ type: 'tool_use', id: `call_${++this.counter}`, name, input }], stopReason: 'tool_use' };
  }
}

const route = (q: string): [string, Record<string, unknown>] => {
  const s = q.toLowerCase();
  if (/announce|notice|message|remind|letter|inform/.test(s)) {
    const aboutFees = /fee|pay/.test(s);
    return ['draft_announcement', {
      audience: 'Parents and guardians',
      title: aboutFees ? 'Reminder: Term 1 school fees' : 'Message from the school office',
      body: aboutFees
        ? 'Dear parents and guardians, this is a friendly reminder that Term 1 school fees are now due. Please pay at the school office, by telebirr or by CBE Birr. Thank you for your support.'
        : `Dear parents and guardians, ${q.trim()}. Thank you, the school office.`,
    }];
  }
  if (/fee|unpaid|owe|balance|paid|payment/.test(s)) return ['list_unpaid_fees', { overdueOnly: /overdue|late/.test(s) }];
  if (/absent|attendance|risk|missing|miss/.test(s)) return ['find_attendance_risks', {}];
  const name = q.match(/\b[A-Z][a-z]{2,}\b/g)?.find((w) => !['Who', 'What', 'How', 'Show', 'Find', 'Tell', 'Is', 'Grade'].includes(w));
  if (name) return ['search_students', { query: name }];
  return ['list_classes', {}];
};

const summarize = (tool: string, r: any): string => {
  switch (tool) {
    case 'list_unpaid_fees':
      return `${r.count} students have an outstanding balance, ${r.totalOutstanding} in total. Largest balances:\n`
        + r.students.slice(0, 5).map((s: any) => `- ${s.name} (${s.class}): ${s.balance}, ${s.status}`).join('\n');
    case 'find_attendance_risks':
      return `${r.count} students attended less than ${r.threshold} of the last ${r.days} days:\n`
        + r.students.slice(0, 5).map((s: any) => `- ${s.name} (${s.class}): ${s.rate}, absent ${s.absent} days`).join('\n');
    case 'search_students':
      return r.total === 0 ? 'No students match that name.'
        : `Found ${r.total}:\n` + r.students.map((s: any) => `- ${s.name}, ${s.class}`).join('\n');
    case 'draft_announcement':
      return `I drafted "${r.draft.title}" for ${r.draft.audience}. Review it below and publish it if it looks right.`;
    case 'list_classes':
      return `The school has ${r.length} classes:\n` + r.map((c: any) => `- ${c.name}: ${c.students} students, ${c.homeroomTeacher}`).join('\n');
    default:
      return JSON.stringify(r).slice(0, 400);
  }
};
