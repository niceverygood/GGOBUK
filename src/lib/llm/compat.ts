import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { pairwiseSummary } from '@/lib/saju/hapchung';
import type { SajuResult } from '@/lib/saju/types';
import type { CompatibilityResult } from '@/types/db';

const SYSTEM = `너는 명리학자다. 두 사람의 사주를 보고 궁합을 분석한다.
규칙:
- JSON으로만 답
- score: 0-100
- hap: 합 관계 배열 (e.g., "일지 합")
- chung: 충 관계 배열
- highlights: 잘 맞는 점 2-3개
- cautions: 주의할 점 2-3개
- summary: 3-4문장
{
  "score": 0,
  "hap": [],
  "chung": [],
  "highlights": [],
  "cautions": [],
  "summary": ""
}`;

export async function generateCompat(params: {
  sajuA: SajuResult;
  sajuB: SajuResult;
  nameA?: string;
  nameB?: string;
  relationLabel?: string;
}): Promise<CompatibilityResult> {
  const { hap, chung } = pairwiseSummary(params.sajuA.palja, params.sajuB.palja);
  const userMsg = `[사람 A]\n${formatSajuContext(params.sajuA, params.nameA)}\n\n[사람 B]\n${formatSajuContext(
    params.sajuB,
    params.nameB,
  )}\n\n관계: ${params.relationLabel ?? '미지정'}\n계산된 일주 합/충: 합=${hap.join(', ') || '없음'}, 충=${
    chung.join(', ') || '없음'
  }\n\n위 정보를 참고해 궁합을 JSON으로.`;
  const { text } = await complete({
    tier: 'main',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 800,
    responseFormat: 'json_object',
  });
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as CompatibilityResult;
}
