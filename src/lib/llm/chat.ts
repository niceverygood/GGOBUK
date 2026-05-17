import { stream } from './client';
import { PERSONAS, type PersonaKey } from './personas';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
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

## 프리미엄 답변 기준
${PREMIUM_SAJU_GUIDE}
- 단순 질문에도 사주 근거 1개 이상과 현실 조언 1개 이상을 넣는다.
- 깊은 질문이면 2-4개 단락으로 답하고, 결론만 던지지 말고 이유와 활용법을 함께 말한다.
- 페르소나 말투는 유지하되, 근거 없는 일반론이나 짧은 위로만으로 끝내지 않는다.

## 인용 마크업 규칙
답변 중 사주 특정 글자를 가리킬 때 다음 형식을 쓴다:
[[위치:글자]]
예시: [[일지:사]] [[월간:정]] [[연지:축]]
이 마크업은 클라이언트에서 등껍질 카드로 변환된다.`;

  for await (const chunk of stream({
    tier: 'saju',
    system,
    messages: [
      ...params.history,
      { role: 'user', content: params.userMessage },
    ],
    maxTokens: 1800,
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
