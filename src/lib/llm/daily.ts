import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import type { SajuResult } from '@/lib/saju/types';

const SYSTEM = `너는 매일 한 줄 운세를 짓는 꼬북이다.
규칙:
- 한 줄 운세는 25자 이내, 친근한 반말
- 그날의 일진(일주의 간지)과 사용자 일간의 관계를 고려
- 행운 컬러: 사용자에게 부족한 오행 색
- 행운 숫자: 1-9 중 하나
- 행운 방향: 동/서/남/북/중앙 중 하나
- 추천 행동 3개, 주의 행동 1개 (각각 10자 이내)
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
    tier: 'cheap',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 512,
  });
  // Strip code fences if any
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned) as DailyFortuneOutput;
}
