import Anthropic from '@anthropic-ai/sdk';
import { normalizeOrigin, isLocalOrigin, serverAppOrigin } from '@/lib/app-url';

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

export type ModelTier = 'main' | 'cheap' | 'compat' | 'saju';
type LLMProvider = 'openrouter' | 'anthropic';

const anthropicSajuModel =
  process.env.ANTHROPIC_MODEL_SAJU?.trim() ||
  process.env.ANTHROPIC_MODEL_COMPAT?.trim() ||
  'claude-sonnet-4-20250514';

const openRouterSajuModel =
  process.env.OPENROUTER_MODEL_SAJU?.trim() ||
  process.env.OPENROUTER_MODEL_COMPAT?.trim() ||
  'openai/gpt-5.1';

const ANTHROPIC_MODELS: Record<ModelTier, string> = {
  main: 'claude-sonnet-4-20250514',
  cheap: 'claude-haiku-4-5-20251001',
  compat: anthropicSajuModel,
  saju: anthropicSajuModel,
};

const OPENROUTER_MODELS: Record<ModelTier, string> = {
  main:
    process.env.OPENROUTER_MODEL_MAIN?.trim() || 'anthropic/claude-opus-4.7',
  cheap:
    process.env.OPENROUTER_MODEL_CHEAP?.trim() || 'anthropic/claude-haiku-4.5',
  compat: openRouterSajuModel,
  saju: openRouterSajuModel,
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

/**
 * 큰 정적 시스템 프롬프트(페르소나 가이드 + PREMIUM_SAJU_GUIDE + 사주 컨텍스트)는
 * 채팅 매 턴·해설 12카테고리 sweep에서 동일하게 반복된다. ephemeral 캐시 1블록으로
 * 묶으면 2번째 호출부터 입력 토큰을 ~10% 비용으로 재사용한다(출력 결과는 불변).
 * SDK가 cache_control 존재 시 anthropic-beta 헤더를 자동 부착한다. Sonnet-4 최소
 * 캐시 prefix는 1024토큰 — 본 시스템들은 수천 토큰이라 충족하고, 작은 시스템(haiku
 * <4096토큰)이면 조용히 무캐시 처리되어(추가 비용 없음) 안전하다.
 */
function toCachedSystem(system: string): Anthropic.TextBlockParam[] {
  return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
}

export interface CompleteParams {
  tier: ModelTier;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  responseFormat?: 'json_object';
  /**
   * Sampling temperature 0..1. Lower = more grounded / deterministic.
   * For saju content we want low temperature so the model sticks to the
   * computed indicators rather than generating loose generalities.
   */
  temperature?: number;
  /**
   * true 면 system 프롬프트를 ephemeral 프롬프트 캐시 블록으로 전송한다.
   * 같은 system 이 짧은 시간(5분 TTL) 안에 반복되는 호출에만 켠다 —
   * 채팅 멀티턴(세션 내 system 동일)·해설 12카테고리 sweep(persona별 system 동일).
   * daily cron·compat 처럼 호출마다 system 이 달라지는 경우엔 켜면 오히려 손해(쓰기 프리미엄만).
   */
  cache?: boolean;
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
    system: params.cache ? toCachedSystem(params.system) : params.system,
    messages: params.messages,
    ...(typeof params.temperature === 'number'
      ? { temperature: params.temperature }
      : {}),
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
    system: params.cache ? toCachedSystem(params.system) : params.system,
    messages: params.messages,
    ...(typeof params.temperature === 'number'
      ? { temperature: params.temperature }
      : {}),
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
  const explicit = normalizeOrigin(process.env.OPENROUTER_SITE_URL);
  if (explicit && !isLocalOrigin(explicit)) return explicit;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  const appOrigin = serverAppOrigin();
  return isLocalOrigin(appOrigin) ? undefined : appOrigin;
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
  if (typeof params.temperature === 'number') {
    body.temperature = params.temperature;
  }
  if (params.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
    if (typeof params.temperature !== 'number') {
      body.temperature = 0.2;
    }
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
