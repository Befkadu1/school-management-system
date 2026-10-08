import { Command } from '../../core/command-bus';

export class AskAssistantCommand extends Command {
  readonly name = 'AskAssistant';
  constructor(public readonly question: string) { super(); }
}

/** Human-in-the-loop: publishing an agent draft is always an explicit command. */
export class PublishDraftCommand extends Command {
  readonly name = 'PublishDraft';
  constructor(public readonly messageId: number, public readonly index: number) { super(); }
}
