import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import type { SajuResult, DaewoonPeriod } from '@/lib/saju/types';

const SYSTEM = `너는 명리학자다. 사용자의 대운 한 구간을 보고 그 시기 일반적으로 겪었을 만한 경험을 추정한다.
규칙:
- 2-3문장으로 짧게
- 단정하지 말고 "~했을 수 있다", "~의 시기였을 가능성이 높다" 어투
- 십성과 대운의 흐름에 근거
- 너무 구체적인 사건은 피하고 삶의 흐름과 감정 위주
- 부정적 표현 최소화`;

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
    tier: 'main',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 256,
  });
  return text;
}
