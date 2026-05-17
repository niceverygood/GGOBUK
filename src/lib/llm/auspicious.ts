import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { SajuResult } from '@/lib/saju/types';

export interface AuspiciousSuggestion {
  date: string;
  reason: string;
  score: number;
}

interface Candidate extends AuspiciousSuggestion {
  dayPillar: string;
}

const SYSTEM = `너는 택일과 길일을 현대적으로 풀어주는 꼬북점 명리 상담가다.
${PREMIUM_SAJU_GUIDE}

규칙:
- 입력 후보 날짜 안에서만 고른다. 날짜를 새로 만들지 않는다.
- 점수는 입력 점수를 존중하되, 설명과 균형이 안 맞으면 0-5점 범위에서만 조정한다.
- reason은 70-140자 정도로 쓴다. 목적, 일진, 사용자 원국과의 관계, 현실 활용 포인트가 들어가야 한다.
- 불안을 조장하지 말고 "좋은 날", "무난한 날", "피로를 줄이는 날"처럼 실용적으로 표현한다.
- JSON 객체만 답한다. 마크다운 금지.
{
  "suggestions": [
    { "date": "YYYY-MM-DD", "score": 80, "reason": "" }
  ]
}`;

function cleanJson(text: string): string {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  return first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
}

export async function enrichAuspiciousSuggestions(params: {
  saju: SajuResult;
  name?: string;
  purpose: string;
  start: string;
  end: string;
  candidates: Candidate[];
}): Promise<AuspiciousSuggestion[]> {
  if (params.candidates.length === 0) return [];
  const allowed = new Map(
    params.candidates.map((candidate) => [candidate.date, candidate]),
  );
  const context = formatSajuContext(params.saju, params.name);
  const userMsg = `목적: ${params.purpose}
기간: ${params.start} ~ ${params.end}

${context}

후보 날짜:
${params.candidates
  .map(
    (candidate) =>
      `- ${candidate.date} / ${candidate.dayPillar} / ${candidate.score}점 / ${candidate.reason}`,
  )
  .join('\n')}

위 후보 중 상위 날짜를 JSON으로 다시 정리해줘.`;

  const { text } = await complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 1800,
    responseFormat: 'json_object',
  });

  const parsed = JSON.parse(cleanJson(text)) as {
    suggestions?: Array<Record<string, unknown>>;
  };
  const normalized =
    parsed.suggestions
      ?.map((item) => {
        const date = typeof item.date === 'string' ? item.date : '';
        const original = allowed.get(date);
        if (!original) return null;
        const score =
          typeof item.score === 'number'
            ? item.score
            : Number.parseInt(String(item.score ?? ''), 10);
        return {
          date,
          score: Math.max(
            0,
            Math.min(
              100,
              Number.isFinite(score) ? Math.round(score) : original.score,
            ),
          ),
          reason:
            typeof item.reason === 'string' && item.reason.trim()
              ? item.reason.trim()
              : original.reason,
        };
      })
      .filter((item): item is AuspiciousSuggestion => Boolean(item)) ?? [];

  return normalized.length > 0
    ? normalized.slice(0, 10)
    : params.candidates.slice(0, 10);
}
