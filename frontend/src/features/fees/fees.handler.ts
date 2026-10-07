import { Command, type CommandHandler } from '../../core/commandBus';
import { feesActions, recordPayment } from '../../store/feesSlice';
import { ClosePaymentDialogCommand, OpenPaymentDialogCommand, RecordPaymentCommand } from './fees.command';
import type { AppStore } from '../../store';

export class PaymentHandler implements CommandHandler<
  OpenPaymentDialogCommand | ClosePaymentDialogCommand | RecordPaymentCommand
> {
  constructor(private store: AppStore) {}

  public async handle(command: Command): Promise<void> {
    if (command instanceof OpenPaymentDialogCommand) {
      this.store.dispatch(feesActions.paymentRequested(command.invoiceId));
    } else if (command instanceof ClosePaymentDialogCommand) {
      this.store.dispatch(feesActions.paymentDismissed());
    } else if (command instanceof RecordPaymentCommand) {
      // The slice keeps the dialog open and shows the error if this is rejected.
      await this.store.dispatch(recordPayment(command.payment));
    }
  }
}
