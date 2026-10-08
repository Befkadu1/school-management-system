import { describe, expect, it } from 'vitest';
import { InvoiceListFactory } from './factory';
import { OpenPaymentDialogCommand } from './fees.command';
import type { InvoiceWithName } from '../../store/fees-slice';

const invoice = (overrides: Partial<InvoiceWithName> = {}): InvoiceWithName => ({
  id: 7, studentId: 1, studentName: 'Hana Tesfaye Alemu', term: '1', description: 'Tuition',
  amountSantim: 500_000, dueDate: '2026-10-01', payments: [], paidSantim: 200_000,
  balanceSantim: 300_000, status: 'partial', ...overrides,
});

describe('InvoiceListFactory', () => {
  it('formats every amount as birr', () => {
    const item = new InvoiceListFactory().create(invoice());

    expect(item.key).toBe(7);
    expect(item.label).toBe('Invoice for Hana Tesfaye Alemu');
    expect(item.columns.map((c) => c.text)).toEqual([
      'Hana Tesfaye Alemu', '5,000.00 birr', '2,000.00 birr', '3,000.00 birr', 'partial',
    ]);
  });

  it('offers a payment command while something is owed', () => {
    const item = new InvoiceListFactory().create(invoice());

    expect(item.action?.label).toBe('Record payment');
    expect(item.action?.command).toEqual(new OpenPaymentDialogCommand(7));
  });

  it('offers nothing once the invoice is settled', () => {
    const item = new InvoiceListFactory().create(invoice({ balanceSantim: 0, status: 'paid' }));

    expect(item.action).toBeUndefined();
  });
});
