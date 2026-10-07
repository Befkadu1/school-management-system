import { useState } from 'react';
import { useAppSelector } from '../../store';
import { useCommand } from '../../core/PlatformProvider';
import { AskAssistantCommand, PublishDraftCommand } from './assistant.command';
import type { AssistantMessage } from '../../store/assistantSlice';
import type { AgentDraft, AgentStep } from '../../api/types';

const SUGGESTIONS = [
  'Which students are often absent?',
  'Who has overdue fees?',
  'Draft a reminder to parents about unpaid fees',
  'How many students are in each class?',
];

export default function AssistantPage() {
  const run = useCommand();
  const pending = useAppSelector((s) => s.assistant.pending);
  const [text, setText] = useState('');

  const ask = (question: string) => {
    if (!question.trim() || pending) {
      return;
    }

    run(new AskAssistantCommand(question));
    setText('');
  };

  return (
    <>
      <h2>Assistant</h2>
      <p className="lede">
        Ask about students, attendance and fees. It looks up the school records to answer, and drafts
        messages for you to approve. Nothing is sent without you.
      </p>
      <Suggestions onPick={ask} />
      <Conversation />
      <AskForm text={text} onChange={setText} onAsk={ask} />
    </>
  );
}

/** Only shown on an empty chat, to give the first question a starting point. */
const Suggestions = ({ onPick }: { onPick: (question: string) => void }) => {
  const hasMessages = useAppSelector((s) => s.assistant.messages.length > 0);
  if (hasMessages) {
    return null;
  }

  return (
    <div className="suggestions">
      {SUGGESTIONS.map((suggestion) => (
        <button key={suggestion} onClick={() => onPick(suggestion)}>{suggestion}</button>
      ))}
    </div>
  );
};

const Conversation = () => {
  const { messages, pending, error } = useAppSelector((s) => s.assistant);

  return (
    <div className="chat" aria-live="polite">
      {messages.map((message) => <Turn key={message.id} message={message} />)}
      {pending && <p className="muted">Looking it up…</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
};

const Turn = ({ message }: { message: AssistantMessage }) => (
  <div className={`turn ${message.role}`}>
    {message.role === 'user' ? message.text : <Answer message={message} />}
  </div>
);

const Answer = ({ message }: { message: AssistantMessage }) => (
  <>
    <div className="answer">{message.text}</div>
    <Trace steps={message.steps} />
    {message.drafts?.map((draft, index) => (
      <Draft key={index} draft={draft} messageId={message.id} index={index} />
    ))}
  </>
);

/** Shows which tools the agent called, so an answer can be checked rather than trusted. */
const Trace = ({ steps }: { steps: AgentStep[] | undefined }) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <details className="trace">
      <summary>How I got this: {steps.length} {steps.length === 1 ? 'lookup' : 'lookups'}</summary>
      <ol>
        {steps.map((step, i) => (
          <li key={i}>
            <code>{step.tool}({JSON.stringify(step.input)})</code>{' '}
            {step.ok ? `in ${step.ms}ms` : <span className="error">failed: {String(step.output)}</span>}
          </li>
        ))}
      </ol>
    </details>
  );
};

/** Human-in-the-loop: the agent writes it, a person decides to publish it. */
const Draft = ({ draft, messageId, index }: {
  draft: AgentDraft & { published?: boolean };
  messageId: number;
  index: number;
}) => {
  const run = useCommand();

  return (
    <div className="draft">
      <h4>{draft.title}</h4>
      <p className="muted">To: {draft.audience}</p>
      <p>{draft.body}</p>
      {draft.published
        ? <strong>Published</strong>
        : (
          <button className="btn primary" onClick={() => run(new PublishDraftCommand(messageId, index))}>
            Publish announcement
          </button>
        )}
    </div>
  );
};

const AskForm = ({ text, onChange, onAsk }: {
  text: string;
  onChange: (text: string) => void;
  onAsk: (question: string) => void;
}) => {
  const pending = useAppSelector((s) => s.assistant.pending);

  return (
    <form className="ask" onSubmit={(e) => { e.preventDefault(); onAsk(text); }}>
      <input
        aria-label="Question for the assistant"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Show Hana's attendance and fees"
      />
      <button className="btn primary" type="submit" disabled={pending || !text.trim()}>Ask</button>
    </form>
  );
};
