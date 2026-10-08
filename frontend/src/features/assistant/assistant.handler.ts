import { Command, type CommandHandler } from '../../core/command-bus';
import { askAssistant, publishDraft } from '../../store/assistant-slice';
import { AskAssistantCommand, PublishDraftCommand } from './assistant.command';
import type { AppStore } from '../../store';

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
