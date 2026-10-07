import { Command } from '../../core/commandBus';
import type { PaymentMethod } from '../../api/types';

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
