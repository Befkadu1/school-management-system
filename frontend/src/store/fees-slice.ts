import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type { InvoiceStatus, InvoiceView, PaymentMethod, Student } from '../api/types';
import type { ThunkExtra } from './extra';
import { fullName, sumBy } from '../lib/fp';

export type StatusFilter = InvoiceStatus | 'open' | 'all';
export type InvoiceWithName = InvoiceView & { studentName: string };

export interface FeesState {
  invoices: InvoiceView[];
  names: Record<number, string>;
  filter: StatusFilter;
  search: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  paymentError: string | null;
  /** Which invoice the payment dialog is open for; the page only reads it. */
  payingInvoiceId: number | null;
}

const initialState: FeesState = {
  invoices: [],
  names: {},
  filter: 'open',
  search: '',
  status: 'idle',
  error: null,
  paymentError: null,
  payingInvoiceId: null,
};

export const fetchFees = createAsyncThunk<
  { invoices: InvoiceView[]; students: Student[] },
  void,
  { extra: ThunkExtra }
>(
  'fees/fetch',
  async (_, { extra }) => {
    // Two independent requests run in parallel
    const [invoices, students] = await Promise.all([extra.api.invoices(), extra.api.students({ limit: 500 })]);
    return { invoices, students: students.items };
  },
);

export const recordPayment = createAsyncThunk<
  void,
  { invoiceId: number; amountSantim: number; method: PaymentMethod; reference: string | null },
  { extra: ThunkExtra; rejectValue: string }
>(
  'fees/recordPayment',
  async (payment, { extra, dispatch, rejectWithValue }) => {
    try {
      await extra.api.recordPayment(payment);
      await dispatch(fetchFees());
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

const slice = createSlice({
  name: 'fees',
  initialState,
  reducers: {
    filterChanged: (state, action: PayloadAction<StatusFilter>) => {
      state.filter = action.payload;
    },
    searchChanged: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    paymentRequested: (state, action: PayloadAction<number>) => {
      state.payingInvoiceId = action.payload;
      state.paymentError = null;
    },
    paymentDismissed: (state) => {
      state.payingInvoiceId = null;
      state.paymentError = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFees.pending, (state) => {
      if (state.status !== 'ready') state.status = 'loading';
    });
    builder.addCase(fetchFees.fulfilled, (state, action) => {
      state.invoices = action.payload.invoices;
      state.names = Object.fromEntries(action.payload.students.map((student) => [student.id, fullName(student)]));
      state.status = 'ready';
    });
    builder.addCase(fetchFees.rejected, (state, action) => {
      state.status = 'error';
      state.error = action.error.message ?? 'Could not load fees';
    });
    builder.addCase(recordPayment.pending, (state) => {
      state.paymentError = null;
    });
    builder.addCase(recordPayment.fulfilled, (state) => {
      state.payingInvoiceId = null;
    });
    builder.addCase(recordPayment.rejected, (state, action) => {
      state.paymentError = action.payload ?? 'Payment was not saved';
    });
  },
});

export const feesActions = slice.actions;
export const feesReducer = slice.reducer;

type Root = { fees: FeesState };

const selectInvoices = (state: Root) => state.fees.invoices;
const selectNames = (state: Root) => state.fees.names;
const selectSearch = (state: Root) => state.fees.search;
const selectPayingInvoiceId = (state: Root) => state.fees.payingInvoiceId;
export const selectFilter = (state: Root) => state.fees.filter;

const matchesFilter = (filter: StatusFilter) => (invoice: InvoiceView) =>
  filter === 'all' || (filter === 'open' ? invoice.balanceSantim > 0 : invoice.status === filter);

const withName = (invoice: InvoiceView, names: Record<number, string>): InvoiceWithName =>
  ({ ...invoice, studentName: names[invoice.studentId] ?? `Student #${invoice.studentId}` });

export const selectVisibleInvoices = createSelector(
  [selectInvoices, selectNames, selectFilter, selectSearch],
  (invoices, names, filter, search): InvoiceWithName[] => {
    const term = search.trim().toLowerCase();
    return invoices
      .filter(matchesFilter(filter))
      .map((invoice) => withName(invoice, names))
      .filter((invoice) => !term || invoice.studentName.toLowerCase().includes(term))
      .sort((a, b) => b.balanceSantim - a.balanceSantim);
  },
);

export const selectPayingInvoice = createSelector(
  [selectInvoices, selectNames, selectPayingInvoiceId],
  (invoices, names, payingInvoiceId): InvoiceWithName | null => {
    const invoice = payingInvoiceId === null
      ? undefined
      : invoices.find((candidate) => candidate.id === payingInvoiceId);
    return invoice ? withName(invoice, names) : null;
  },
);

export const selectFeeTotals = createSelector([selectInvoices], (invoices) => ({
  billed: sumBy(invoices, (invoice) => invoice.amountSantim),
  collected: sumBy(invoices, (invoice) => invoice.paidSantim),
  outstanding: sumBy(invoices, (invoice) => invoice.balanceSantim),
}));
