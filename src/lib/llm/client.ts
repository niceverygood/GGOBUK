import Anthropic from '@anthropic-ai/sdk';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();
const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

const anthropic = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null;
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class LLMNotConfiguredError extends Error {
  code = 'LLM_NOT_CONFIGURED';
  constructor() {
    super('OPENROUTER_API_KEY or ANTHROPIC_API_KEY is not configured');
  }
}

export function isLLMConfigured(): boolean {
  return !!openRouterApiKey || !!anthropic;
}

export type ModelTier = 'main' | 'cheap' | 'compat';
type LLMProvider = 'openrouter' | 'anthropic';

const ANTHROPIC_MODELS: Record<ModelTier, string> = {
  main: 'claude-sonnet-4-20250514',
  cheap: 'claude-haiku-4-5-20251001',
  compat:
    process.env.ANTHROPIC_MODEL_COMPAT?.trim() || 'claude-sonnet-4-20250514',
};

const OPENROUTER_MODELS: Record<ModelTier, string> = {
  main:
    process.env.OPENROUTER_MODEL_MAIN?.trim() || 'anthropic/claude-opus-4.7',
  cheap:
    process.env.OPENROUTER_MODEL_CHEAP?.trim() || 'anthropic/claude-haiku-4.5',
  compat: process.env.OPENROUTER_MODEL_COMPAT?.trim() || 'openai/gpt-5.1',
};

const MODELS: Record<ModelTier, string> = openRouterApiKey
  ? OPENROUTER_MODELS
  : ANTHROPIC_MODELS;

function getProvider(): LLMProvider {
  if (openRouterApiKey) return 'openrouter';
  if (anthropic) return 'anthropic';
  throw new LLMNotConfiguredError();
}

function getAnthropicClient(): Anthropic {
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
  responseFormat?: 'json_object';
}

export async function complete(
  params: CompleteParams,
): Promise<{ text: string; tokensUsed: number; model: string }> {
  const provider = getProvider();
  const model = MODELS[params.tier];
  if (provider === 'openrouter') {
    return openRouterComplete(model, params);
  }
  return anthropicComplete(model, params);
}

async function anthropicComplete(
  model: string,
  params: CompleteParams,
): Promise<{ text: string; tokensUsed: number; model: string }> {
  const client = getAnthropicClient();
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
  const provider = getProvider();
  const model = MODELS[params.tier];
  if (provider === 'openrouter') {
    yield* openRouterStream(model, params);
    return;
  }

  const client = getAnthropicClient();
  const res = await client.messages.stream({
    model,
    max_tokens: params.maxTokens ?? 2048,
    system: params.system,
    messages: params.messages,
  });
  for await (const event of res) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type OpenRouterContent =
  | string
  | Array<
      | string
      | {
          type?: string;
          text?: string;
          content?: string;
        }
    >;

interface OpenRouterCompletionResponse {
  choices?: Array<{
    message?: {
      content?: OpenRouterContent;
    };
    delta?: {
      content?: OpenRouterContent;
    };
  }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    code?: string | number;
    message?: string;
  };
}

function openRouterMessages(params: CompleteParams): OpenRouterMessage[] {
  return [{ role: 'system', content: params.system }, ...params.messages];
}

function appReferer(): string | undefined {
  const explicit =
    process.env.OPENROUTER_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  return vercelUrl ? `https://${vercelUrl}` : undefined;
}

function headerSafe(value: string | undefined, fallback: string): string {
  const safe = value?.trim().replace(/[^\x20-\x7e]/g, '');
  return safe || fallback;
}

function openRouterHeaders(): Record<string, string> {
  if (!openRouterApiKey) throw new LLMNotConfiguredError();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${openRouterApiKey}`,
    'Content-Type': 'application/json',
    'X-OpenRouter-Title': headerSafe(process.env.OPENROUTER_APP_NAME, 'GGOBUK'),
  };
  const referer = appReferer();
  if (referer) headers['HTTP-Referer'] = referer;
  return headers;
}

function openRouterBody(
  model: string,
  params: CompleteParams,
  streamResponse = false,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: openRouterMessages(params),
    max_tokens: params.maxTokens ?? 2048,
    stream: streamResponse,
  };
  if (params.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
    body.temperature = 0.2;
  }
  return body;
}

function normalizeContent(content: OpenRouterContent | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      return part.text ?? part.content ?? '';
    })
    .filter(Boolean)
    .join('\n');
}

async function readOpenRouterError(res: Response): Promise<Error> {
  const raw = await res.text();
  let message = raw.slice(0, 500);
  try {
    const parsed = JSON.parse(raw) as OpenRouterCompletionResponse;
    message = parsed.error?.message || message;
  } catch {
    // Keep the raw response snippet.
  }
  return new Error(`OpenRouter API error ${res.status}: ${message}`);
}

async function openRouterComplete(
  model: string,
  params: CompleteParams,
): Promise<{ text: string; tokensUsed: number; model: string }> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify(openRouterBody(model, params)),
  });
  if (!res.ok) throw await readOpenRouterError(res);

  const json = (await res.json()) as OpenRouterCompletionResponse;
  if (json.error) {
    throw new Error(
      `OpenRouter API error ${json.error.code ?? 'unknown'}: ${json.error.message ?? 'unknown error'}`,
    );
  }

  const text = normalizeContent(json.choices?.[0]?.message?.content);
  return {
    text,
    tokensUsed:
      json.usage?.total_tokens ??
      (json.usage?.prompt_tokens ?? 0) + (json.usage?.completion_tokens ?? 0),
    model: json.model ?? model,
  };
}

function parseStreamChunk(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:'))
    return '';

  const data = trimmed.slice(5).trim();
  if (!data || data === '[DONE]') return '';

  const json = JSON.parse(data) as OpenRouterCompletionResponse;
  if (json.error) {
    throw new Error(
      `OpenRouter API error ${json.error.code ?? 'unknown'}: ${json.error.message ?? 'unknown error'}`,
    );
  }
  return normalizeContent(json.choices?.[0]?.delta?.content);
}

async function* openRouterStream(
  model: string,
  params: CompleteParams,
): AsyncIterable<string> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify(openRouterBody(model, params, true)),
  });
  if (!res.ok) throw await readOpenRouterError(res);
  if (!res.body) throw new Error('OpenRouter API error: empty stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const text = parseStreamChunk(line);
      if (text) yield text;
    }

    if (done) break;
  }

  const tail = parseStreamChunk(buffer);
  if (tail) yield tail;
}

export { MODELS };
