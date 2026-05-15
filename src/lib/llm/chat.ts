import { stream } from './client';
import { PERSONAS, type PersonaKey } from './personas';
import { formatSajuContext } from './prompts/saju_context';
import type { SajuResult } from '@/lib/saju/types';
import type { CitedCard } from '@/types/db';

export async function* chatStream(params: {
  persona: PersonaKey;
  saju: SajuResult;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  name?: string;
}): AsyncIterable<string> {
  const persona = PERSONAS[params.persona];
  const context = formatSajuContext(params.saju, params.name);
  const system = `${persona.systemPrompt}

## 사용자 사주 정보 (반드시 이 데이터에 근거해서 답)
${context}

## 인용 마크업 규칙
답변 중 사주 특정 글자를 가리킬 때 다음 형식을 쓴다:
[[위치:글자]]
예시: [[일지:사]] [[월간:정]] [[연지:축]]
이 마크업은 클라이언트에서 등껍질 카드로 변환된다.`;

  for await (const chunk of stream({
    tier: 'main',
    system,
    messages: [...params.history, { role: 'user', content: params.userMessage }],
    maxTokens: 1024,
  })) {
    yield chunk;
  }
}

// Parse [[위치:글자]] markup → cited_cards JSON.
// Allows optional whitespace around the colon/brackets.
export function extractCitedCards(text: string): CitedCard[] {
  const regex = /\[\[\s*([^:\]]+?)\s*:\s*([^\]]+?)\s*\]\]/g;
  const cards: CitedCard[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    cards.push({ position: m[1], char: m[2] });
  }
  return cards;
}
