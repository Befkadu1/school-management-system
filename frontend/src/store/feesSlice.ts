import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { InvoiceStatus, InvoiceView, PaymentMethod, Student } from '../api/types';
import type { ThunkExtra } from './extra';
import { fullName, sumBy } from '../lib/fp';

export type StatusFilter = InvoiceStatus | 'open' | 'all';
export type InvoiceWithName = InvoiceView & { studentName: string };

export interface FeesState {
  invoices: InvoiceView[]; names: Record<number, string>; filter: StatusFilter; search: string;
  status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null; paymentError: string | null;
  /** Which invoice the payment dialog is open for; the page only reads it. */
  payingInvoiceId: number | null;
}
const initialState: FeesState = {
  invoices: [], names: {}, filter: 'open', search: '', status: 'idle', error: null, paymentError: null, payingInvoiceId: null,
};

export const fetchFees = createAsyncThunk<{ invoices: InvoiceView[]; students: Student[] }, void, { extra: ThunkExtra }>(
  'fees/fetch',
  async (_, { extra }) => {
    // Two independent requests run in parallel
    const [invoices, students] = await Promise.all([extra.api.invoices(), extra.api.students({ limit: 500 })]);
    return { invoices, students: students.items };
  },
);

export const recordPayment = createAsyncThunk<void, { invoiceId: number; amountSantim: number; method: PaymentMethod; reference: string | null }, { extra: ThunkExtra; rejectValue: string }>(
  'fees/recordPayment',
  async (p, { extra, dispatch, rejectWithValue }) => {
    try {
      await extra.api.recordPayment(p);
      await dispatch(fetchFees());
    } catch (e) { return rejectWithValue((e as Error).message); }
  },
);

const slice = createSlice({
  name: 'fees',
  initialState,
  reducers: {
    filterChanged: (s, a: PayloadAction<StatusFilter>) => { s.filter = a.payload; },
    searchChanged: (s, a: PayloadAction<string>) => { s.search = a.payload; },
    paymentRequested: (s, a: PayloadAction<number>) => { s.payingInvoiceId = a.payload; s.paymentError = null; },
    paymentDismissed: (s) => { s.payingInvoiceId = null; s.paymentError = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchFees.pending, (s) => { if (s.status !== 'ready') s.status = 'loading'; });
    b.addCase(fetchFees.fulfilled, (s, a) => {
      s.invoices = a.payload.invoices;
      s.names = Object.fromEntries(a.payload.students.map((st) => [st.id, fullName(st)]));
      s.status = 'ready';
    });
    b.addCase(fetchFees.rejected, (s, a) => { s.status = 'error'; s.error = a.error.message ?? 'Could not load fees'; });
    b.addCase(recordPayment.pending, (s) => { s.paymentError = null; });
    b.addCase(recordPayment.fulfilled, (s) => { s.payingInvoiceId = null; });
    b.addCase(recordPayment.rejected, (s, a) => { s.paymentError = a.payload ?? 'Payment was not saved'; });
  },
});

export const feesActions = slice.actions;
export const feesReducer = slice.reducer;

type Root = { fees: FeesState };
const selectInvoices = (s: Root) => s.fees.invoices;
const selectNames = (s: Root) => s.fees.names;
export const selectFilter = (s: Root) => s.fees.filter;
const selectSearch = (s: Root) => s.fees.search;

const matchesFilter = (filter: StatusFilter) => (inv: InvoiceView) =>
  filter === 'all' || (filter === 'open' ? inv.balanceSantim > 0 : inv.status === filter);

const withName = (invoice: InvoiceView, names: Record<number, string>): InvoiceWithName =>
  ({ ...invoice, studentName: names[invoice.studentId] ?? `Student #${invoice.studentId}` });

export const selectVisibleInvoices = createSelector(
  [selectInvoices, selectNames, selectFilter, selectSearch],
  (invoices, names, filter, search): InvoiceWithName[] => {
    const term = search.trim().toLowerCase();
    return invoices
      .filter(matchesFilter(filter))
      .map((inv) => withName(inv, names))
      .filter((inv) => !term || inv.studentName.toLowerCase().includes(term))
      .sort((a, b) => b.balanceSantim - a.balanceSantim);
  },
);

const selectPayingInvoiceId = (s: Root) => s.fees.payingInvoiceId;

export const selectPayingInvoice = createSelector(
  [selectInvoices, selectNames, selectPayingInvoiceId],
  (invoices, names, id): InvoiceWithName | null => {
    const invoice = id === null ? undefined : invoices.find((i) => i.id === id);
    return invoice ? withName(invoice, names) : null;
  },
);

export const selectFeeTotals = createSelector([selectInvoices], (invoices) => ({
  billed: sumBy(invoices, (i) => i.amountSantim),
  collected: sumBy(invoices, (i) => i.paidSantim),
  outstanding: sumBy(invoices, (i) => i.balanceSantim),
}));
