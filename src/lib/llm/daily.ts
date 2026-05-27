import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import { HANJA_NOTATION_RULE } from './prompts/hanja_rule';
import { analyzeSaju, iljiRelation } from '@/lib/saju/analysis';
import { CHEONGAN, JIJI } from '@/lib/saju/constants';
import type { SajuResult } from '@/lib/saju/types';

const DAILY_MOODS = [
  'happy',
  'excited',
  'surprised',
  'relaxed',
  'thinking',
  'worried',
] as const;

type DailyMood = (typeof DAILY_MOODS)[number];

const MOOD_ALIASES: Record<string, DailyMood> = {
  happy: 'happy',
  excited: 'excited',
  surprised: 'surprised',
  relaxed: 'relaxed',
  thinking: 'thinking',
  worried: 'worried',
  calm: 'relaxed',
  focused: 'thinking',
  cautious: 'worried',
  기쁨: 'happy',
  신남: 'excited',
  놀람: 'surprised',
  편안: 'relaxed',
  고민: 'thinking',
  걱정: 'worried',
};

const SYSTEM = `너는 매일의 일진을 개인 사주와 연결해 읽는 꼬북점 상담가다.
${PREMIUM_SAJU_GUIDE}

${HANJA_NOTATION_RULE}

규칙:
- 한 줄 운세는 28-42자, 사용자의 오늘 흐름이 느껴지는 친근한 문장. 일반론 금지.
- 한 줄 안에 반드시 다음 중 하나는 들어가야 한다: 일진×일간 관계(예: "정인이 들어와 보호받기 좋은 날"), 진행 중 대운/세운의 결, 사용자 일주 60갑자의 결 중 하나.
- "오늘은 좋은 날이야" / "긍정적으로 보내자" 같은 추상문 금지.
- 그날의 일진(일주의 간지), 사용자 일간, 오행 균형, 진행 중 대운/세운을 함께 고려
- 행운 컬러: 부족하거나 보완하면 좋은 오행 색 (목=초록, 화=빨강, 토=노랑, 금=흰색/은색, 수=검정/파랑)
- 행운 숫자: 1-9 중 하나
- 행운 방향: 동/서/남/북/중앙 중 하나
- 추천 행동 3개는 각각 18-32자, "왜"가 살짝 드러나게. 예: "정인 시간이라 책 한 권 챙겨 카페에서 30분" (○) / "독서를 하세요" (✗)
- 주의 행동 1-2개는 각각 18-32자. "충이 와서 OO 조심" 식으로 근거 살짝.
- ⚠️ 한 행동 안에 두 가지 상황·행위를 묶을 때는 두 번째 것도 명사·동사를 명확히 풀어 쓴다. 두 번째가 짧은 단어 하나로 끝나 의미가 잘리지 않게 하라.
  예: "비교심 올라올 때 즉흥적인 한마디나 결제" (✗ — '결제' 단독이 잘림)
      "비교심 올라올 때 친구한테 톡 쏘거나 충동 결제 조심" (○)
      "비교심 올라올 때 한마디 욱하기, 그리고 즉흥 결제 둘 다 조심" (○)
- 두 가지를 한 줄에 묶을 자신이 없으면 차라리 한 가지로 분명하게 쓴다. 의미가 잘릴 바엔 항목을 2개로 분리하라.
- mood: ${DAILY_MOODS.map((m) => `'${m}'`).join('|')} 중 하나
  - happy: 부드럽게 좋은 흐름
  - excited: 추진력과 확장감이 강한 흐름
  - surprised: 예상 밖의 신호나 변수가 있는 흐름
  - relaxed: 쉬어가며 회복하기 좋은 흐름
  - thinking: 정리와 판단이 필요한 흐름
  - worried: 신중한 점검이 필요한 흐름
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
  mood: DailyMood;
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
  const mood = MOOD_ALIASES[String(value.mood ?? '').trim()] ?? 'relaxed';
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
  const analysis = analyzeSaju(params.saju);

  // Map ilji gan/ji string back to indices for the relation helper. iljiGan/iljiJi
  // can be either Korean ("정", "사") or hanja ("丁", "巳") in practice — accept both.
  const ganList = CHEONGAN as readonly string[];
  const jiList = JIJI as readonly string[];
  const ganHanja = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const jiHanja = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const ganIdx = (() => {
    const i = ganList.indexOf(params.iljiGan);
    if (i >= 0) return i;
    const j = ganHanja.indexOf(params.iljiGan);
    return j >= 0 ? j : 0;
  })();
  const jiIdx = (() => {
    const i = jiList.indexOf(params.iljiJi);
    if (i >= 0) return i;
    const j = jiHanja.indexOf(params.iljiJi);
    return j >= 0 ? j : 0;
  })();
  const rel = iljiRelation(params.saju.palja.day.ganIdx, ganIdx, jiIdx);

  // 한글 일진/대운/세운 형식 — LLM이 한자만 단독으로 못 쓰게 한글을 명시.
  const iljiGanKo = ganList[ganIdx];
  const iljiJiKo = jiList[jiIdx];
  const iljiGanHj = ganHanja[ganIdx];
  const iljiJiHj = jiHanja[jiIdx];
  const dwLine = analysis.currentDaewoon
    ? `${analysis.currentDaewoon.pillar.gan}${analysis.currentDaewoon.pillar.ji}(${analysis.currentDaewoon.pillar.ganHanja}${analysis.currentDaewoon.pillar.jiHanja}, ${analysis.currentDaewoon.sipsung})`
    : '없음';
  const sw = analysis.currentSewoon;
  const swLine = `${sw.pillar.gan}${sw.pillar.ji}(${sw.pillar.ganHanja}${sw.pillar.jiHanja}, ${sw.sipsung})`;

  const userMsg = `오늘은 ${params.date}, 일진은 ${iljiGanKo}${iljiJiKo}(${iljiGanHj}${iljiJiHj})이야.

${context}

## 오늘 일진 × 본인 분석
- 일진 천간↔일간 관계: ${rel.ganSipsung}${rel.hap ? ' (천간합)' : rel.chung ? ' (천간충)' : ''}
- 일진 지지 오행: ${rel.jiOhaeng}
- 사용자 일간 강약: ${analysis.strength.label}, 용신 후보: ${analysis.yongsin.main}
- 진행 중 대운: ${dwLine}
- 올해 세운: ${swLine}

작성 규칙:
- one_liner는 위 일진 관계와 진행 중 대운/세운을 반영한 오늘의 결과지향 한 줄. 일반론 금지.
- ⚠️ 60갑자(일진/세운/대운)와 명리 술어는 본문에서 반드시 한글 우선 + 괄호 한자 형식. 한자 단독 노출은 금지. 예: "경자(庚子)" ○ / "庚子" ✗
- lucky_color는 용신 또는 부족한 오행에 대응하는 색.
- recommend 3개는 일진과 본인 사주의 만남에서 실제로 잘 풀릴 행동.
- avoid는 일진에서 자극되는 약점.
- mood는 일진×일간 관계와 컨디션을 종합해 happy, excited, surprised, relaxed, thinking, worried 중 하나로 고른다.
JSON으로만 응답.`;
  const { text } = await complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 1200,
    responseFormat: 'json_object',
    temperature: 0.5,
  });
  return normalizeDaily(JSON.parse(cleanJson(text)));
}
