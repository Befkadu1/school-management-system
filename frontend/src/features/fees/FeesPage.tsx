import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchFees, feesActions, selectFeeTotals, selectFilter, selectPayingInvoice, selectVisibleInvoices,
  type StatusFilter,
} from '../../store/feesSlice';
import { useCommand, useViewFactory } from '../../core/PlatformProvider';
import { ClosePaymentDialogCommand, RecordPaymentCommand } from './fees.command';
import { ListRow } from '../../core/views/ListRow';
import { formatBirr } from '../../lib/fp';
import type { ListItem } from '../../core/views/types';
import type { InvoiceWithName } from '../../store/feesSlice';
import type { PaymentMethod } from '../../api/types';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Not fully paid' }, { value: 'overdue', label: 'Overdue' },
  { value: 'partial', label: 'Partly paid' }, { value: 'paid', label: 'Paid' }, { value: 'all', label: 'All' },
];
const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' }, { value: 'telebirr', label: 'telebirr' },
  { value: 'cbe_birr', label: 'CBE Birr' }, { value: 'bank', label: 'Bank transfer' },
];
const COLUMNS = '2fr 1fr 1fr 1fr 0.8fr auto';

export default function FeesPage() {
  const dispatch = useAppDispatch();

  useEffect(() => { void dispatch(fetchFees()); }, [dispatch]);

  return (
    <>
      <h2>Fees</h2>
      <p className="lede">Term 1 tuition. Record payments as families pay at the office, by telebirr or CBE Birr.</p>
      <Totals />
      <Filters />
      <LoadError />
      <InvoiceList />
      <PaymentDialog />
    </>
  );
}

const Totals = () => {
  const totals = useAppSelector(selectFeeTotals);

  return (
    <div className="figures">
      <div className="figure">
        <strong>{formatBirr(totals.collected)}</strong>
        <span>collected of {formatBirr(totals.billed)}</span>
      </div>
      <div className="figure">
        <strong>{formatBirr(totals.outstanding)}</strong>
        <span>still to collect</span>
      </div>
    </div>
  );
};

const Filters = () => {
  const dispatch = useAppDispatch();
  const filter = useAppSelector(selectFilter);
  const search = useAppSelector((s) => s.fees.search);

  return (
    <div className="toolbar">
      <label className="field">
        Show
        <select value={filter} onChange={(e) => dispatch(feesActions.filterChanged(e.target.value as StatusFilter))}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </label>
      <label className="field">
        Student
        <input
          type="search"
          value={search}
          placeholder="Name"
          onChange={(e) => dispatch(feesActions.searchChanged(e.target.value))}
        />
      </label>
    </div>
  );
};

const LoadError = () => {
  const error = useAppSelector((s) => s.fees.error);
  if (!error) {
    return null;
  }

  return <p className="error" role="alert">{error}</p>;
};

const InvoiceList = () => {
  const invoices = useAppSelector(selectVisibleInvoices);
  const status = useAppSelector((s) => s.fees.status);
  const toListItem = useViewFactory<ListItem, InvoiceWithName>('invoice-list');

  if (status === 'loading') {
    return <p className="muted">Loading fees…</p>;
  }

  return (
    <div className="table-scroll"><div>
      <ColumnHeadings />
      {invoices.length === 0 && <p className="empty">No invoices match this filter.</p>}
      {invoices.slice(0, 200).map((invoice) => (
        <ListRow key={invoice.id} item={toListItem(invoice)} columns={COLUMNS} withAction />
      ))}
      {invoices.length > 200 && <p className="muted">Showing the 200 largest balances. Search to find others.</p>}
    </div></div>
  );
};

const ColumnHeadings = () => (
  <div className="ruled-row ruled-head" style={{ gridTemplateColumns: COLUMNS }}>
    <span>Student</span>
    <span className="num">Fee</span>
    <span className="num">Paid</span>
    <span className="num">Balance</span>
    <span>Status</span>
    <span />
  </div>
);

const PaymentDialog = () => {
  const run = useCommand();
  const invoice = useAppSelector(selectPayingInvoice);
  const dialog = useRef<HTMLDialogElement>(null);

  // <dialog> is opened imperatively, so the store state drives the DOM call.
  useEffect(() => {
    if (invoice) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
    }
  }, [invoice]);

  const close = () => run(new ClosePaymentDialogCommand());

  return (
    <dialog ref={dialog} onClose={close} aria-label="Record payment">
      {invoice && <PaymentForm invoice={invoice} onCancel={close} />}
    </dialog>
  );
};

const PaymentForm = ({ invoice, onCancel }: { invoice: InvoiceWithName; onCancel: () => void }) => {
  const run = useCommand();
  const error = useAppSelector((s) => s.fees.paymentError);

  const submit = (form: FormData) => {
    run(new RecordPaymentCommand({
      invoiceId: invoice.id,
      amountSantim: Math.round(Number(form.get('amount')) * 100),
      method: form.get('method') as PaymentMethod,
      reference: (form.get('reference') as string) || null,
    }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}>
      <h3>Payment from {invoice.studentName}</h3>
      <p className="muted">Balance {formatBirr(invoice.balanceSantim)}</p>
      <div className="form-grid">
        <label className="field">
          Amount (birr)
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            max={invoice.balanceSantim / 100}
            defaultValue={invoice.balanceSantim / 100}
            required
          />
        </label>
        <label className="field">
          Paid by
          <select name="method" defaultValue="telebirr">
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="field">
          Transaction reference
          <input name="reference" placeholder="Optional" />
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="toolbar">
        <button className="btn primary" type="submit">Record payment</button>
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};
