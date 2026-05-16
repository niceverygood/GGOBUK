import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export class LLMNotConfiguredError extends Error {
  code = 'LLM_NOT_CONFIGURED';
  constructor() {
    super('ANTHROPIC_API_KEY is not configured');
  }
}

export function isLLMConfigured(): boolean {
  return !!anthropic;
}

export type ModelTier = 'main' | 'cheap';

const MODELS: Record<ModelTier, string> = {
  main: 'claude-sonnet-4-20250514',
  cheap: 'claude-haiku-4-5-20251001',
};

function getClient(): Anthropic {
  if (!anthropic) {
    throw new LLMNotConfiguredError();
  }
  return anthropic;
}

export interface CompleteParams {
  tier: ModelTier;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
}

export async function complete(params: CompleteParams): Promise<{ text: string; tokensUsed: number; model: string }> {
  const client = getClient();
  const model = MODELS[params.tier];
  const res = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 2048,
    system: params.system,
    messages: params.messages,
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return {
    text,
    tokensUsed: (res.usage.input_tokens ?? 0) + (res.usage.output_tokens ?? 0),
    model,
  };
}

export async function* stream(params: CompleteParams): AsyncIterable<string> {
  const client = getClient();
  const model = MODELS[params.tier];
  const res = await client.messages.stream({
    model,
    max_tokens: params.maxTokens ?? 2048,
    system: params.system,
    messages: params.messages,
  });
  for await (const event of res) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

export { MODELS };
