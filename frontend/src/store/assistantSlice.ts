import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AgentDraft, AgentStep } from '../api/types';
import type { ThunkExtra } from './extra';

export interface AssistantMessage {
  id: number; role: 'user' | 'assistant'; text: string;
  steps?: AgentStep[]; drafts?: (AgentDraft & { published?: boolean })[]; model?: string;
}
export interface AssistantState { messages: AssistantMessage[]; pending: boolean; error: string | null }
const initialState: AssistantState = { messages: [], pending: false, error: null };

let nextId = 1;

export const askAssistant = createAsyncThunk<{ text: string; steps: AgentStep[]; drafts: AgentDraft[]; model: string }, string, { extra: ThunkExtra; state: { assistant: AssistantState } }>(
  'assistant/ask',
  async (message, { extra, getState }) => {
    // Send the earlier turns (text only) so the agent can follow the conversation
    const history = getState().assistant.messages.slice(0, -1).map(({ role, text }) => ({ role, text }));
    const res = await extra.api.ask(message, history);
    return { text: res.answer, steps: res.steps, drafts: res.drafts, model: res.model };
  },
);

/** Human-in-the-loop: the agent only drafts; a person decides to publish. */
export const publishDraft = createAsyncThunk<{ messageId: number; index: number }, { messageId: number; index: number }, { extra: ThunkExtra; state: { assistant: AssistantState } }>(
  'assistant/publishDraft',
  async ({ messageId, index }, { extra, getState }) => {
    const draft = getState().assistant.messages.find((m) => m.id === messageId)?.drafts?.[index];
    if (!draft) throw new Error('Draft not found');
    const { title, body, audience } = draft;
    await extra.api.publishAnnouncement({ title, body, audience });
    return { messageId, index };
  },
);

const slice = createSlice({
  name: 'assistant',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(askAssistant.pending, (s, a) => {
      s.messages.push({ id: nextId++, role: 'user', text: a.meta.arg });
      s.pending = true; s.error = null;
    });
    b.addCase(askAssistant.fulfilled, (s, a) => {
      s.messages.push({ id: nextId++, role: 'assistant', ...a.payload });
      s.pending = false;
    });
    b.addCase(askAssistant.rejected, (s, a) => { s.pending = false; s.error = a.error.message ?? 'The assistant did not answer'; });
    b.addCase(publishDraft.fulfilled, (s, a) => {
      const draft = s.messages.find((m) => m.id === a.payload.messageId)?.drafts?.[a.payload.index];
      if (draft) draft.published = true;
    });
  },
});

export const assistantReducer = slice.reducer;
