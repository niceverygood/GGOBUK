import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { PremiumService } from '@/lib/premium-services';
import type { SajuResult } from '@/lib/saju/types';

const SYSTEM = `너는 꼬북점의 유료 운세 상품을 작성하는 프리미엄 명리 상담가다.
${PREMIUM_SAJU_GUIDE}

출력 규칙:
- 한국어로만 쓴다. JSON과 코드블록은 쓰지 않는다.
- 첫 문단은 반드시 "한 줄 결론:"으로 시작한다.
- "정확하다", "반드시 된다" 같은 단정 대신 사주 근거와 현실 장면을 촘촘히 연결한다.
- 사용자가 돈을 내고 읽을 만한 밀도로 쓴다. 얕은 조언이나 일반론은 피한다.
- 다음 구조를 지킨다.
  1) "## 핵심 근거 표" 아래 마크다운 표. 열은 "근거 | 해석 | 현실에서 보이는 장면".
  2) "## 이번 리포트의 요점" 아래 bullet 4개.
  3) "## 깊은 풀이" 아래 3-5개 단락.
  4) "## 실행 플랜" 아래 마크다운 표. 열은 "상황 | 선택 기준 | 바로 할 일".
- 표의 셀은 모바일에서 읽히도록 짧고 선명하게 쓴다.
- 전체 분량은 1,500-2,400자 안팎으로 쓴다.`;

export async function generatePremiumServiceReport(params: {
  saju: SajuResult;
  name?: string;
  service: PremiumService;
  topic?: string;
}): Promise<{ content: string; tokensUsed: number; model: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const context = formatSajuContext(params.saju, params.name);
  const topicLine = params.topic?.trim()
    ? `\n사용자 고민: ${params.topic.trim()}`
    : '';
  const userMsg = `오늘 날짜: ${today}
상품명: ${params.service.title}
상품 설명: ${params.service.subtitle}
중점: ${params.service.focus}
결과물: ${params.service.deliverable}${topicLine}

${context}

위 사주와 상품 목적에 맞춰 유료 리포트를 작성해줘. 원국, 오행 분포, 십성, 신살, 대운 중 실제 근거를 최소 6개 이상 사용하고, 사용자가 "내 얘기 같다"고 느낄 만큼 생활 장면과 실행 기준을 구체적으로 써줘.`;

  const result = await complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 3000,
  });

  return {
    content: result.text,
    tokensUsed: result.tokensUsed,
    model: result.model,
  };
}
