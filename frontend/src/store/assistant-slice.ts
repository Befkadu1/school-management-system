import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AgentDraft, AgentStep } from '../api/types';
import type { ThunkExtra } from './extra';

export interface AssistantMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** Which tools the agent called, so an answer can be checked rather than trusted. */
  steps?: AgentStep[];
  drafts?: (AgentDraft & { published?: boolean })[];
  model?: string;
}

export interface AssistantState {
  messages: AssistantMessage[];
  pending: boolean;
  error: string | null;
}

const initialState: AssistantState = {
  messages: [],
  pending: false,
  error: null,
};

let nextId = 1;

export const askAssistant = createAsyncThunk<
  { text: string; steps: AgentStep[]; drafts: AgentDraft[]; model: string },
  string,
  { extra: ThunkExtra; state: { assistant: AssistantState } }
>(
  'assistant/ask',
  async (message, { extra, getState }) => {
    // Send the earlier turns (text only) so the agent can follow the conversation
    const history = getState().assistant.messages.slice(0, -1).map(({ role, text }) => ({ role, text }));
    const response = await extra.api.ask(message, history);
    return { text: response.answer, steps: response.steps, drafts: response.drafts, model: response.model };
  },
);

/** Human-in-the-loop: the agent only drafts; a person decides to publish. */
export const publishDraft = createAsyncThunk<
  { messageId: number; index: number },
  { messageId: number; index: number },
  { extra: ThunkExtra; state: { assistant: AssistantState } }
>(
  'assistant/publishDraft',
  async ({ messageId, index }, { extra, getState }) => {
    const draft = getState().assistant.messages.find((message) => message.id === messageId)?.drafts?.[index];
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
  extraReducers: (builder) => {
    builder.addCase(askAssistant.pending, (state, action) => {
      state.messages.push({ id: nextId++, role: 'user', text: action.meta.arg });
      state.pending = true;
      state.error = null;
    });
    builder.addCase(askAssistant.fulfilled, (state, action) => {
      state.messages.push({ id: nextId++, role: 'assistant', ...action.payload });
      state.pending = false;
    });
    builder.addCase(askAssistant.rejected, (state, action) => {
      state.pending = false;
      state.error = action.error.message ?? 'The assistant did not answer';
    });
    builder.addCase(publishDraft.fulfilled, (state, action) => {
      const message = state.messages.find((candidate) => candidate.id === action.payload.messageId);
      const draft = message?.drafts?.[action.payload.index];
      if (draft) draft.published = true;
    });
  },
});

export const assistantReducer = slice.reducer;
