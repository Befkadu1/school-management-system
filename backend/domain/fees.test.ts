import { describe, it, expect } from 'vitest';
import { balanceSantim, invoiceStatus, validatePayment, formatBirr } from './fees.js';
import type { InvoiceWithPayments } from './types.js';

const invoice = (paid: number[], dueDate = '2026-10-01'): InvoiceWithPayments => ({
  id: 1, studentId: 1, term: 'T1', description: 'Tuition', amountSantim: 100_000, dueDate,
  payments: paid.map((amountSantim, i) => ({ id: i, invoiceId: 1, amountSantim, method: 'cash', reference: null, paidAt: '' })),
});

describe('fees', () => {
  it('computes the remaining balance', () => {
    expect(balanceSantim(invoice([30_000, 20_000]))).toBe(50_000);
    expect(balanceSantim(invoice([100_000]))).toBe(0);
  });

  it.each([
    [[100_000], '2026-10-07', 'paid'],
    [[], '2026-09-01', 'unpaid'],
    [[10_000], '2026-09-01', 'partial'],
    [[10_000], '2026-10-07', 'overdue'],
  ] as const)('status for payments %j on %s is %s', (paid, today, expected) => {
    expect(invoiceStatus(invoice([...paid]), today)).toBe(expected);
  });

  it('rejects overpayment and non-positive amounts', () => {
    expect(validatePayment(invoice([90_000]), 20_000)).toMatch(/exceeds/);
    expect(validatePayment(invoice([]), 0)).toMatch(/positive/);
    expect(validatePayment(invoice([100_000]), 1)).toMatch(/fully paid/);
    expect(validatePayment(invoice([]), 50_000)).toBeNull();
  });

  it('formats santim as birr', () => {
    expect(formatBirr(480_000)).toBe('4,800.00 birr');
  });
});
