import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { SajuResult, DaewoonPeriod } from '@/lib/saju/types';

const SYSTEM = `너는 대운 흐름을 현실 언어로 풀어주는 꼬북점 명리 상담가다.
${PREMIUM_SAJU_GUIDE}

규칙:
- 5-7문장으로 쓴다
- 단정하지 말고 "~했을 수 있다", "~의 시기였을 가능성이 높다" 어투
- 대운 천간/지지, 십성, 원국의 강한 기운과 부족한 기운을 연결한다
- 너무 구체적인 사건을 맞히려 하지 말고 삶의 흐름, 감정, 관계, 일/공부의 변화 위주로 추정한다
- 마지막 문장은 그 시기를 돌아보는 질문이나 해석 포인트로 마무리한다
- 부정적 표현은 최소화하고, 힘든 흐름도 성장의 언어로 바꿔준다`;

export async function generateColdRead(params: {
  saju: SajuResult;
  daewoon: DaewoonPeriod;
  name?: string;
}): Promise<string> {
  const context = formatSajuContext(params.saju, params.name);
  const userMsg = `${context}\n\n${params.daewoon.startYear}년부터 ${
    params.daewoon.startYear + 9
  }년까지 (${params.daewoon.startAge}세~${params.daewoon.startAge + 9}세) 대운 ${
    params.daewoon.pillar.ganHanja
  }${params.daewoon.pillar.jiHanja} (${params.daewoon.sipsung}) 시기에 대한 추정을 해줘.`;
  const { text } = await complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 1000,
  });
  return text;
}
