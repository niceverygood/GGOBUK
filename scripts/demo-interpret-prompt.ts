// Prints the exact (system, user) messages we would send to the LLM for the
// 'overview' interpretation of Hi's reference saju. Useful for prompt review
// without burning an API call.
import { buildSajuResult } from '../src/lib/saju';
import { formatSajuContext } from '../src/lib/llm/prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from '../src/lib/llm/prompts/premium_saju';
import { INTERPRETATION_CATEGORIES } from '../src/lib/llm/interpret';

const saju = buildSajuResult({
  birthDate: '1985-11-14',
  birthTime: '14:05',
  isLunar: false,
  gender: 'M',
});

const category = 'overview';
const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category)!;
const context = formatSajuContext(saju, 'Hi');
const anchorLines = cat.anchors.map((a) => `- ${a}`).join('\n');
const userMsg = `다음 사주를 "${cat.title}" 관점에서 깊이 풀이해줘.

${context}

중점: ${cat.prompt}

이 카테고리에서 반드시 인용해야 하는 명리 근거(앵커):
${anchorLines}

작성 요구:
- 단락마다 위 앵커 중 최소 하나를 실제로 인용한다.
- 판독 근거 표에는 위 앵커를 4행 이상 반영한다.
- "왜 이 풀이가 나오는지"가 매 단락에서 느껴져야 한다.
- 사용자가 체감으로 검증할 수 있는 행동/감정 장면을 최소 3개 포함한다.
- 컨텍스트에 없는 글자/합·충·신살은 만들어내지 않는다.`;

console.log('════════════════════════════════════════════════════════');
console.log(`Category: ${cat.title}`);
console.log('Anchors:', cat.anchors.join(', '));
console.log('════════════════════════════════════════════════════════');
console.log('\n[SYSTEM PROMPT LENGTH]', PREMIUM_SAJU_GUIDE.length, 'chars');
console.log('\n[USER MESSAGE LENGTH]', userMsg.length, 'chars');
console.log('\n──────── USER MESSAGE TAIL ────────');
console.log(userMsg.slice(-700));
