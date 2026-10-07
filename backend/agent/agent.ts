import type { LlmClient, LlmMessage, ToolResultBlock, ToolUseBlock } from './llm.js';
import { toToolSpecs, type AgentTool, type ToolContext } from './tools.js';

export const SYSTEM_PROMPT = `You are the office assistant for a private school in Ethiopia.
You help the school administrator answer questions about students, attendance and fees.
Rules:
- Always use the tools to look up facts. Never invent names, numbers or balances.
- Money is in Ethiopian birr. Keep answers short and concrete, with names and numbers.
- To contact parents or staff, call draft_announcement. You cannot send or publish anything yourself;
  tell the user the draft is waiting for their approval.
- If a question is outside the school data, say what you can help with instead.`;

export interface AgentStep { tool: string; input: unknown; ok: boolean; output: unknown; ms: number }
export interface AgentDraft { title: string; body: string; audience: string }
export interface AgentResult { answer: string; steps: AgentStep[]; drafts: AgentDraft[]; model: string }

export interface ChatTurn { role: 'user' | 'assistant'; text: string }

/**
 * The agent loop: send the conversation and tool list to the model; when the
 * model asks for tools, run them and send the results back; repeat until the
 * model answers in plain text or we hit maxSteps (a safety limit).
 */
export const runAgent = async (opts: {
  llm: LlmClient; tools: AgentTool[]; ctx: ToolContext; message: string; history?: ChatTurn[]; maxSteps?: number;
}): Promise<AgentResult> => {
  const { llm, tools, ctx, message, history = [], maxSteps = 6 } = opts;
  const byName = new Map(tools.map((t) => [t.name, t]));
  const specs = toToolSpecs(tools);
  const messages: LlmMessage[] = [
    ...history.slice(-10).map((t): LlmMessage => (t.role === 'user'
      ? { role: 'user', content: t.text }
      : { role: 'assistant', content: [{ type: 'text', text: t.text }] })),
    { role: 'user', content: message },
  ];
  const steps: AgentStep[] = [];
  const drafts: AgentDraft[] = [];

  for (let i = 0; i < maxSteps; i++) {
    const res = await llm.complete({ system: SYSTEM_PROMPT, messages, tools: specs });
    messages.push({ role: 'assistant', content: res.content });
    const calls = res.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');

    if (calls.length === 0 || res.stopReason !== 'tool_use') {
      const answer = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
      return { answer: answer || 'I could not find an answer.', steps, drafts, model: llm.name };
    }

    // Independent tool calls run in parallel
    const results = await Promise.all(calls.map(async (call): Promise<ToolResultBlock> => {
      const started = performance.now();
      const tool = byName.get(call.name);
      try {
        if (!tool) throw new Error(`Unknown tool ${call.name}`);
        const input = tool.schema.parse(call.input);
        const output = await tool.run(input, ctx);
        if (tool.kind === 'draft') drafts.push(input as AgentDraft);
        steps.push({ tool: call.name, input, ok: true, output, ms: Math.round(performance.now() - started) });
        return { type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        steps.push({ tool: call.name, input: call.input, ok: false, output: msg, ms: Math.round(performance.now() - started) });
        // Errors go back to the model so it can correct itself
        return { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true };
      }
    }));
    messages.push({ role: 'user', content: results });
  }
  return { answer: 'I stopped after too many steps. Try a more specific question.', steps, drafts, model: llm.name };
};
