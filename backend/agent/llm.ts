import Anthropic from '@anthropic-ai/sdk';

// Our own small message types. The agent depends on these, not on a vendor SDK
// (adapter pattern), so we can plug in a scripted model for tests and offline demos.
export type TextBlock = { type: 'text'; text: string };
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export type LlmMessage =
  | { role: 'user'; content: string | ToolResultBlock[] }
  | { role: 'assistant'; content: Array<TextBlock | ToolUseBlock> };

export interface ToolSpec { name: string; description: string; input_schema: Record<string, unknown> }

export interface LlmRequest { system: string; messages: LlmMessage[]; tools: ToolSpec[] }
export interface LlmResponse { content: Array<TextBlock | ToolUseBlock>; stopReason: string }

export interface LlmClient { readonly name: string; complete(req: LlmRequest): Promise<LlmResponse> }

export class AnthropicLlm implements LlmClient {
  readonly name: string;
  private client: Anthropic;

  constructor(apiKey: string, private model: string) {
    this.client = new Anthropic({ apiKey });
    this.name = model;
  }

  async complete({ system, messages, tools }: LlmRequest): Promise<LlmResponse> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system,
      messages: messages as Anthropic.MessageParam[],
      tools: tools as Anthropic.Tool[],
    });
    const content = res.content.flatMap((b): Array<TextBlock | ToolUseBlock> => {
      if (b.type === 'text') return [{ type: 'text', text: b.text }];
      if (b.type === 'tool_use') return [{ type: 'tool_use', id: b.id, name: b.name, input: b.input as Record<string, unknown> }];
      return [];
    });
    return { content, stopReason: res.stop_reason ?? 'end_turn' };
  }
}
