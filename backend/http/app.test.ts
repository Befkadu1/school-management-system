import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { createMemoryRepos } from '../repositories/memory.js';
import { generateSeed } from '../db/seedData.js';
import { ScriptedLlm } from '../agent/scripted.js';

const TODAY = '2026-10-07';
let server: Server;
let base = '';

beforeAll(() => {
  const app = createApp({ repos: createMemoryRepos(generateSeed(TODAY)), llm: new ScriptedLlm(), today: () => TODAY, commandMiddleware: undefined });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((done) => server.close(() => done())));

const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('HTTP API (in-memory)', () => {
  it('searches students', async () => {
    const res = await fetch(`${base}/api/students?search=a&limit=5`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items.length).toBeLessThanOrEqual(5);
    expect(body.total).toBeGreaterThan(0);
  });

  it('returns 400 with a readable message for invalid students', async () => {
    const res = await fetch(`${base}/api/students`, json('POST', { firstName: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/firstName/);
  });

  it('saves attendance and reads it back', async () => {
    const put = await fetch(`${base}/api/attendance`, json('PUT', { date: TODAY, records: [{ studentId: 1, status: 'late' }] }));
    expect(put.status).toBe(200);
    const records = await (await fetch(`${base}/api/attendance?classId=1&date=${TODAY}`)).json();
    expect(records).toContainEqual({ studentId: 1, date: TODAY, status: 'late' });
  });

  it('answers through the agent with a visible trace', async () => {
    const res = await fetch(`${base}/api/assistant`, json('POST', { message: 'Which students are often absent?' }));
    const body = await res.json();
    expect(body.steps[0].tool).toBe('find_attendance_risks');
    expect(body.answer).toMatch(/attended less than/);
  });
});
