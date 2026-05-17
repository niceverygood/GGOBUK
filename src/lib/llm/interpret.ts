import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

export const INTERPRETATION_CATEGORIES: Array<{
  key: InterpretationCategory;
  title: string;
  prompt: string;
}> = [
  {
    key: 'overview',
    title: '총평',
    prompt: '원국 전체의 온도, 강한 기운, 부족한 기운, 삶의 중심 테마',
  },
  {
    key: 'ohaeng',
    title: '오행 균형',
    prompt:
      '오행 분포가 성향과 컨디션, 관계, 일 처리 방식에 미치는 영향과 보완법',
  },
  {
    key: 'ilju',
    title: '일주 분석',
    prompt: '일주가 보여주는 본질, 자존감, 사랑 방식, 반복되는 선택 패턴',
  },
  {
    key: 'strength',
    title: '타고난 장점',
    prompt: '사주에서 드러나는 강점 3-4가지와 현실에서 빛나는 장면',
  },
  {
    key: 'weakness',
    title: '경계할 점',
    prompt: '주의해야 할 약점, 약점이 드러나는 상황, 개선 방향',
  },
  {
    key: 'personality',
    title: '성격',
    prompt: '내면과 외면의 차이, 감정 처리, 타인에게 보이는 인상',
  },
  {
    key: 'career',
    title: '직업과 적성',
    prompt: '잘 맞는 일의 구조, 조직/프리랜서 성향, 피하면 좋은 업무 방식',
  },
  {
    key: 'wealth',
    title: '재물운',
    prompt: '돈을 모으는 방식, 재물이 새는 패턴, 안정적인 수익 구조',
  },
  {
    key: 'love',
    title: '연애와 결혼',
    prompt:
      '끌리는 사람, 사랑받고 싶은 방식, 궁합이 편한 유형, 반복되는 연애 패턴',
  },
  {
    key: 'family',
    title: '가족 관계',
    prompt: '부모/형제/자녀와의 거리감, 책임감, 가족 안에서 맡기 쉬운 역할',
  },
  {
    key: 'friends',
    title: '대인관계',
    prompt: '친구와 동료 사이에서 생기는 강점, 오해, 좋은 관계 관리법',
  },
  {
    key: 'direction',
    title: '좋은 방향',
    prompt: '활동 방향, 색상, 환경, 루틴 등 기운을 보완하는 생활 조언',
  },
];

const SYSTEM = `너는 "꼬북점"의 대표 명리 상담가다. 사용자의 사주를 깊이 읽어 유료 상담 수준의 개인 리포트를 작성한다.

${PREMIUM_SAJU_GUIDE}

출력 규칙:
- 한국어 평문만 쓴다. 마크다운 표, JSON, 코드블록은 쓰지 않는다.
- 첫 문단은 "한 줄 결론:"으로 시작해 2-3문장으로 핵심을 잡는다.
- 이어서 3-4개 단락을 쓴다. 각 단락은 4-6문장으로 충분히 설명한다.
- 각 단락에는 반드시 원국 근거와 현실 해석, 활용 조언이 함께 들어가야 한다.
- 사용자 이름이 있으면 자연스럽게 부른다.
- 전체 분량은 1,200-1,800자 안팎으로 쓴다.`;

export async function generateInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new Error(`Unknown interpretation category: ${category}`);
  const context = formatSajuContext(saju, name);
  const userMsg = `다음 사주를 "${cat.title}" 관점에서 깊이 풀이해줘.\n\n${context}\n\n중점: ${cat.prompt}`;
  return complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 2600,
  }).then((r) => ({
    content: r.text,
    tokensUsed: r.tokensUsed,
    model: r.model,
  }));
}

export async function generateAllInterpretations(
  saju: SajuResult,
  name?: string,
): Promise<
  Array<{
    category: InterpretationCategory;
    content: string;
    tokensUsed: number;
    model: string;
  }>
> {
  const results = await Promise.all(
    INTERPRETATION_CATEGORIES.map(async (cat) => {
      const r = await generateInterpretation(saju, cat.key, name);
      return {
        category: cat.key,
        content: r.content,
        tokensUsed: r.tokensUsed,
        model: r.model,
      };
    }),
  );
  return results;
}
