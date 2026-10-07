import { OpenPaymentDialogCommand } from './fees.command';
import { formatBirr } from '../../lib/fp';
import type { ViewFactory } from '../../core/viewFactoryRegistry';
import type { ListItem, ListItemAction } from '../../core/views/types';
import type { InvoiceWithName } from '../../store/feesSlice';

/**
 * Builds the list row for an invoice. The row's button carries a command
 * rather than a callback, so the same row works wherever the bus is reachable.
 * Everything it needs is on the invoice, so unlike StudentListFactory it takes
 * no platform.
 */
export class InvoiceListFactory {
  public create: ViewFactory<ListItem, InvoiceWithName> = (invoice: InvoiceWithName): ListItem => {
    return {
      key: invoice.id,
      label: `Invoice for ${invoice.studentName}`,
      columns: [
        { text: invoice.studentName },
        { text: formatBirr(invoice.amountSantim), className: 'num' },
        { text: formatBirr(invoice.paidSantim), className: 'num' },
        { text: formatBirr(invoice.balanceSantim), className: 'num' },
        { text: invoice.status, className: `status status-${invoice.status}` },
      ],
      action: this.getAction(invoice),
    };
  };

  /** Nothing is owed, so there is nothing to pay. */
  private getAction(invoice: InvoiceWithName): ListItemAction | undefined {
    if (invoice.balanceSantim <= 0) {
      return;
    }

    return { label: 'Record payment', command: new OpenPaymentDialogCommand(invoice.id) };
  }
}
