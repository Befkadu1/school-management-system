import type { InvoiceWithPayments } from './types.js';

// Pure functions: same input → same output, no I/O, no mutation. Easy to test.

export const paidSantim = (inv: InvoiceWithPayments): number =>
  inv.payments.reduce((sum, p) => sum + p.amountSantim, 0);

export const balanceSantim = (inv: InvoiceWithPayments): number =>
  Math.max(0, inv.amountSantim - paidSantim(inv));

export const isOverdue = (inv: InvoiceWithPayments, today: string): boolean =>
  balanceSantim(inv) > 0 && inv.dueDate < today; // ISO dates compare lexicographically

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export const invoiceStatus = (inv: InvoiceWithPayments, today: string): InvoiceStatus => {
  const balance = balanceSantim(inv);
  if (balance === 0) return 'paid';
  if (isOverdue(inv, today)) return 'overdue';
  return paidSantim(inv) > 0 ? 'partial' : 'unpaid';
};

export interface InvoiceView extends InvoiceWithPayments {
  paidSantim: number; balanceSantim: number; status: InvoiceStatus;
}

export const toInvoiceView = (today: string) => (inv: InvoiceWithPayments): InvoiceView => ({
  ...inv,
  paidSantim: paidSantim(inv),
  balanceSantim: balanceSantim(inv),
  status: invoiceStatus(inv, today),
});

/** Returns an error message, or null if the payment is allowed. */
export const validatePayment = (inv: InvoiceWithPayments, amountSantim: number): string | null => {
  if (!Number.isInteger(amountSantim) || amountSantim <= 0) return 'Amount must be a positive whole number of santim';
  const balance = balanceSantim(inv);
  if (balance === 0) return 'This invoice is already fully paid';
  if (amountSantim > balance) return `Amount exceeds the remaining balance of ${formatBirr(balance)}`;
  return null;
};

export const formatBirr = (santim: number): string =>
  `${(santim / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} birr`;
