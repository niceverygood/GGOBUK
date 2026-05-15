import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

export const INTERPRETATION_CATEGORIES: Array<{
  key: InterpretationCategory;
  title: string;
  prompt: string;
}> = [
  { key: 'overview', title: '총평', prompt: '사주 전체의 흐름과 핵심 키워드를 5-7문장으로 풀이' },
  { key: 'ohaeng', title: '오행 균형', prompt: '오행 분포의 특징과 보완해야 할 기운' },
  { key: 'ilju', title: '일주 분석', prompt: '일주가 보여주는 본질적 성향' },
  { key: 'strength', title: '타고난 장점', prompt: '사주에서 드러나는 강점 3가지' },
  { key: 'weakness', title: '경계할 점', prompt: '주의해야 할 약점과 개선 방향' },
  { key: 'personality', title: '성격', prompt: '내면과 외면의 성격적 특징' },
  { key: 'career', title: '직업과 적성', prompt: '잘 맞는 직업군과 피할 직업' },
  { key: 'wealth', title: '재물운', prompt: '재물을 모으는 방식과 주의점' },
  { key: 'love', title: '연애와 결혼', prompt: '이상형, 궁합 잘 맞는 일주, 주의할 패턴' },
  { key: 'family', title: '가족 관계', prompt: '부모/형제/자녀와의 관계 흐름' },
  { key: 'friends', title: '대인관계', prompt: '친구와 동료 관계의 특징' },
  { key: 'direction', title: '좋은 방향', prompt: '거주/활동에 좋은 방향과 색상' },
];

const SYSTEM = `너는 한국 명리학에 정통한 사주 풀이가다.
답변 규칙:
- 각 풀이는 5-8문장으로 깊이 있게
- 한자 술어는 (괄호 한글) 병기
- 사주 원국 데이터에 근거해서 작성. 일반론 금지.
- 친근하지만 진지한 톤
- 절대 부정적 단정 금지 ("당신은 실패할 것이다" 류 X)
- 약점도 잠재력으로 재해석
- 의학/법률/투자 직접 조언 금지
출력은 마크다운 없이 평문으로.`;

export async function generateInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new Error(`Unknown interpretation category: ${category}`);
  const context = formatSajuContext(saju, name);
  const userMsg = `다음 사주를 "${cat.title}" 관점에서 풀이해줘.\n\n${context}\n\n주문: ${cat.prompt}`;
  return complete({
    tier: 'main',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 1200,
  }).then((r) => ({ content: r.text, tokensUsed: r.tokensUsed, model: r.model }));
}

export async function generateAllInterpretations(
  saju: SajuResult,
  name?: string,
): Promise<Array<{ category: InterpretationCategory; content: string; tokensUsed: number; model: string }>> {
  const results = await Promise.all(
    INTERPRETATION_CATEGORIES.map(async (cat) => {
      const r = await generateInterpretation(saju, cat.key, name);
      return { category: cat.key, content: r.content, tokensUsed: r.tokensUsed, model: r.model };
    }),
  );
  return results;
}
