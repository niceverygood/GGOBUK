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
  /** 과거 대화에서 추린 장기 기억(평문 줄목록). 없으면 블록을 생략. */
  memory?: string;
}): AsyncIterable<string> {
  const persona = PERSONAS[params.persona];
  const context = formatSajuContext(params.saju, params.name);
  const memoryBlock = params.memory?.trim()
    ? `

## 꼬북이가 이 사람에 대해 기억하는 것 (과거 대화에서 — 장기 기억)
${params.memory.trim()}
→ 자연스럽게 활용하되, 매번 전부 나열하지 말고 흐름에 맞는 1-2개만 슬쩍 짚어라. 처음 보는 척하지 말 것. 기억이 틀렸다고 정정하면 사용자의 말을 따른다.`
    : '';
  const system = `${persona.systemPrompt}

## 사용자 사주 정보 (반드시 이 데이터에 근거해서 답)
${context}${memoryBlock}

## 프리미엄 답변 기준
${PREMIUM_SAJU_GUIDE}
- 단순 질문에도 사주 근거 1개 이상과 현실 조언 1개 이상을 넣는다.
- 깊은 질문이면 2-4개 단락으로 답하고, 결론만 던지지 말고 이유와 활용법을 함께 말한다.
- 페르소나 말투는 유지하되, 근거 없는 일반론이나 짧은 위로만으로 끝내지 않는다.

## ⚠️ 마크다운 금지 — 채팅 메시지는 일반 텍스트로만
이 채팅은 마크다운을 렌더링하지 않는다. 그래서 마크다운 기호를 쓰면
사용자에겐 그대로 깨진 기호로 보인다. 절대 다음 기호를 쓰지 마라:
- ❌ # 또는 ## 헤딩 → 평문 문단으로
- ❌ **굵게** 또는 *기울임* → 그냥 따옴표나 명확한 명사로
- ❌ > 인용 블록 → 일반 문장으로
- ❌ --- 구분선 → 줄바꿈으로
- ❌ - 또는 1) 같은 불릿 마커 → 자연스러운 문장으로 풀어 쓰기
- ❌ 표(|---|) → 풀어서 평문으로
- ❌ \`코드\` 백틱

대신 자연스러운 한국어 평문 단락으로만 쓴다. 강조하고 싶으면 한국어 어휘로
("핵심은 ~야", "주의할 점은 ~지" 같은 식). 단락 구분은 빈 줄 하나로.

## 답변 길이
- 짧은 질문(인사·확인): 2-4문장
- 일반 질문: 4-8문장 (한 단락)
- 깊은 풀이 요청: 2-3 단락, 각 단락 3-5문장
- 토큰이 부족하더라도 문장은 반드시 마침표로 끝맺어라. 중간에 잘리지 않게 길이를 미리 가늠해서 쓴다.

## 인용 마크업 규칙
답변 중 사주 특정 글자를 가리킬 때 다음 형식을 쓴다:
[[위치:글자]]
예시: [[일지:사]] [[월간:정]] [[연지:축]]
이 마크업은 클라이언트에서 등껍질 카드로 변환된다. 이건 마크다운이 아니라
앱 전용 인용 카드 마크업이므로 사용해도 된다.`;

  for await (const chunk of stream({
    tier: 'saju',
    system,
    // 세션 내 system(페르소나+사주+기억)은 턴마다 동일 → 캐시로 입력 토큰 재사용.
    cache: true,
    messages: [
      ...params.history,
      { role: 'user', content: params.userMessage },
    ],
    maxTokens: 3200,
    temperature: 0.7,
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
