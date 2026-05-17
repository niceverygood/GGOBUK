import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { SajuResult } from '@/lib/saju/types';

const SYSTEM = `너는 매일의 일진을 개인 사주와 연결해 읽는 꼬북점 상담가다.
${PREMIUM_SAJU_GUIDE}

규칙:
- 한 줄 운세는 28-42자, 사용자의 오늘 흐름이 느껴지는 친근한 문장
- 그날의 일진(일주의 간지), 사용자 일간, 오행 균형을 함께 고려
- 행운 컬러: 부족하거나 보완하면 좋은 오행 색
- 행운 숫자: 1-9 중 하나
- 행운 방향: 동/서/남/북/중앙 중 하나
- 추천 행동 3개는 각각 14-24자, 왜 도움이 되는지 살짝 드러나게
- 주의 행동 1-2개는 각각 14-24자
- mood: 'happy'|'calm'|'focused'|'cautious' 중 하나
JSON으로만 답한다. 다른 텍스트 금지.
{
  "one_liner": "...",
  "lucky_color": "...",
  "lucky_number": 0,
  "lucky_direction": "...",
  "recommend": ["...", "...", "..."],
  "avoid": ["..."],
  "mood": "..."
}`;

export interface DailyFortuneOutput {
  one_liner: string;
  lucky_color: string;
  lucky_number: number;
  lucky_direction: string;
  recommend: string[];
  avoid: string[];
  mood: 'happy' | 'calm' | 'focused' | 'cautious';
}

function cleanJson(text: string): string {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  return first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
}

function normalizeDaily(raw: unknown): DailyFortuneOutput {
  const value =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const recommend = Array.isArray(value.recommend)
    ? value.recommend
        .map(String)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const avoid = Array.isArray(value.avoid)
    ? value.avoid
        .map(String)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];
  const mood = ['happy', 'calm', 'focused', 'cautious'].includes(
    String(value.mood),
  )
    ? (value.mood as DailyFortuneOutput['mood'])
    : 'calm';
  const luckyNumber =
    typeof value.lucky_number === 'number'
      ? value.lucky_number
      : Number.parseInt(String(value.lucky_number ?? 7), 10);

  return {
    one_liner: String(
      value.one_liner ?? '오늘은 속도를 낮추고 기운을 고르는 날이야',
    ).trim(),
    lucky_color: String(value.lucky_color ?? '민트').trim(),
    lucky_number: Math.max(
      1,
      Math.min(9, Number.isFinite(luckyNumber) ? luckyNumber : 7),
    ),
    lucky_direction: String(value.lucky_direction ?? '동').trim(),
    recommend,
    avoid,
    mood,
  };
}

export async function generateDaily(params: {
  saju: SajuResult;
  date: string;
  iljiGan: string;
  iljiJi: string;
  name?: string;
}): Promise<DailyFortuneOutput> {
  const context = formatSajuContext(params.saju, params.name);
  const userMsg = `오늘은 ${params.date}, 일진은 ${params.iljiGan}${params.iljiJi}이야.\n\n${context}\n\n오늘 운세를 JSON으로.`;
  const { text } = await complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 900,
    responseFormat: 'json_object',
  });
  return normalizeDaily(JSON.parse(cleanJson(text)));
}
