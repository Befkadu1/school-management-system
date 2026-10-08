import { describe, it, expect } from 'vitest';
import { createCommandBus, validation, logging, CommandError } from './bus.js';
import { recordPayment, recordAttendance } from './commands.js';
import { createMemoryRepos } from '../repositories/memory.js';
import { generateSeed } from '../db/seed-data.js';

const TODAY = '2026-10-07';
const setup = () => {
  const repos = createMemoryRepos(generateSeed(TODAY));
  const lines: string[] = [];
  const bus = createCommandBus(() => ({ repos, today: TODAY }), [logging((l) => lines.push(l)), validation]);
  return { repos, bus, lines };
};

describe('command bus', () => {
  it('validates input before executing', async () => {
    const { bus } = setup();
    await expect(bus.dispatch(recordPayment, { invoiceId: 'x' })).rejects.toBeInstanceOf(CommandError);
  });

  it('records a valid payment and logs it', async () => {
    const { bus, repos, lines } = setup();
    const unpaid = (await repos.fees.invoices()).find((i) => i.payments.length === 0)!;
    const payment = await bus.dispatch(recordPayment, { invoiceId: unpaid.id, amountSantim: 1000, method: 'telebirr' });
    expect(payment.amountSantim).toBe(1000);
    expect(lines.at(-1)).toMatch(/RecordPayment ok/);
  });

  it('refuses attendance in the future', async () => {
    const { bus } = setup();
    await expect(bus.dispatch(recordAttendance, { date: '2026-12-01', records: [{ studentId: 1, status: 'present' }] }))
      .rejects.toThrow(/future/);
  });
});
