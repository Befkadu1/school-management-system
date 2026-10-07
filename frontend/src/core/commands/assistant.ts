import { Command, type CommandHandler } from '../commandBus';
import { askAssistant, publishDraft } from '../../store/assistantSlice';
import type { AppStore } from '../../store';

export class AskAssistantCommand extends Command {
  readonly name = 'AskAssistant';
  constructor(public readonly question: string) { super(); }
}

/** Human-in-the-loop: publishing an agent draft is always an explicit command. */
export class PublishDraftCommand extends Command {
  readonly name = 'PublishDraft';
  constructor(public readonly messageId: number, public readonly index: number) { super(); }
}

export class AssistantHandler implements CommandHandler<AskAssistantCommand | PublishDraftCommand> {
  constructor(private store: AppStore) {}

  public async handle(command: Command): Promise<void> {
    if (command instanceof AskAssistantCommand) {
      const question = command.question.trim();
      if (!question || this.store.getState().assistant.pending) return;
      await this.store.dispatch(askAssistant(question));
    } else if (command instanceof PublishDraftCommand) {
      await this.store.dispatch(publishDraft({ messageId: command.messageId, index: command.index }));
    }
  }
}
