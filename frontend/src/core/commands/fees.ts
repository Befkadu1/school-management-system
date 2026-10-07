import { Command, type CommandHandler } from '../commandBus';
import { feesActions, recordPayment } from '../../store/feesSlice';
import type { PaymentMethod } from '../../api/types';
import type { AppStore } from '../../store';

export class OpenPaymentDialogCommand extends Command {
  readonly name = 'OpenPaymentDialog';
  constructor(public readonly invoiceId: number) { super(); }
}

export class ClosePaymentDialogCommand extends Command { readonly name = 'ClosePaymentDialog'; }

export class RecordPaymentCommand extends Command {
  readonly name = 'RecordPayment';
  constructor(public readonly payment: {
    invoiceId: number; amountSantim: number; method: PaymentMethod; reference: string | null;
  }) { super(); }
}

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
