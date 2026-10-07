import { AnthropicLlm, type LlmClient } from './llm.js';
import { ScriptedLlm } from './scripted.js';

/** Factory: real Claude when an API key is configured, otherwise the offline scripted model. */
export const createLlmClient = (env: NodeJS.ProcessEnv = process.env): LlmClient =>
  env.ANTHROPIC_API_KEY
    ? new AnthropicLlm(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || 'claude-sonnet-5-5')
    : new ScriptedLlm();

export { runAgent } from './agent.js';
export { tools } from './tools.js';
