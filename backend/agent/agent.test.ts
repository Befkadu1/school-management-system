import { describe, it, expect } from 'vitest';
import { runAgent } from './agent.js';
import { tools } from './tools.js';
import { ScriptedLlm } from './scripted.js';
import type { LlmClient, LlmRequest, LlmResponse } from './llm.js';
import { createMemoryRepos } from '../repositories/memory.js';
import { generateSeed } from '../db/seedData.js';

const TODAY = '2026-10-07';
const ctx = { repos: createMemoryRepos(generateSeed(TODAY)), today: TODAY };

/** A fake model that replays scripted responses, so we can test the loop precisely. */
const replay = (responses: LlmResponse[]): LlmClient & { requests: LlmRequest[] } => {
  const requests: LlmRequest[] = [];
  return { name: 'replay', requests, complete: async (req) => { requests.push(structuredClone(req)); return responses.shift()!; } };
};

describe('agent loop', () => {
  it('runs a tool, feeds the result back, then returns the answer', async () => {
    const llm = replay([
      { stopReason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'list_unpaid_fees', input: { limit: 3 } }] },
      { stopReason: 'end_turn', content: [{ type: 'text', text: 'Three families owe fees.' }] },
    ]);
    const result = await runAgent({ llm, tools, ctx, message: 'Who owes fees?' });
    expect(result.answer).toBe('Three families owe fees.');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({ tool: 'list_unpaid_fees', ok: true });
    const lastRequest = llm.requests.at(-1)!;
    expect(lastRequest.messages.at(-1)).toMatchObject({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1' }] });
  });

  it('returns tool errors to the model instead of crashing', async () => {
    const llm = replay([
      { stopReason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'get_student_profile', input: { studentId: 99999 } }] },
      { stopReason: 'end_turn', content: [{ type: 'text', text: 'Not found.' }] },
    ]);
    const result = await runAgent({ llm, tools, ctx, message: 'Profile of 99999' });
    expect(result.steps[0]?.ok).toBe(false);
    expect(llm.requests.at(-1)!.messages.at(-1)).toMatchObject({ content: [{ is_error: true }] });
  });

  it('stops after maxSteps', async () => {
    const loop: LlmResponse = { stopReason: 'tool_use', content: [{ type: 'tool_use', id: 'x', name: 'list_classes', input: {} }] };
    const llm = replay(Array.from({ length: 5 }, () => structuredClone(loop)));
    const result = await runAgent({ llm, tools, ctx, message: 'loop', maxSteps: 3 });
    expect(result.answer).toMatch(/too many steps/);
    expect(result.steps).toHaveLength(3);
  });

  it('collects drafts but never publishes them', async () => {
    const result = await runAgent({ llm: new ScriptedLlm(), tools, ctx, message: 'Remind parents about unpaid fees' });
    expect(result.drafts[0]?.title).toMatch(/fees/);
    expect(await ctx.repos.announcements.list()).toHaveLength(0);
  });
});
