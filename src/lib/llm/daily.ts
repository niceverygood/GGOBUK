import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
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

⭐️ 가장 중요한 규칙 — 사용자에게 보이는 모든 문장(one_liner·recommend·avoid)은
명리를 1도 모르는 일반인이 카톡 읽듯 한 번에 이해돼야 한다. 사주 분석은 너의
'속 계산'으로만 쓰고, 결론(오늘 어떤 하루이고 뭘 하면 좋은지)만 쉬운 일상어로 낸다.

🚫 사용자 노출 문장에 절대 쓰지 않는 것:
- 명리 술어: 편인·정인·식신·상관·비견·겁재·정재·편재·정관·편관·용신·격국·신살·일간·일지
- 흐름 용어: 일진·일주·대운·세운·천간·지지·합·충·형
- 한자, 그리고 60갑자 이름: 정사·을목·계미·병오·경자 같은 간지 명칭
  (괄호 한자도 금지. daily는 한자를 아예 쓰지 않는다.)
- 오행을 굳이 '목/화/토/금/수'로 부르지 말고(행운 컬러 제외) 그냥 일상어로.

✅ 의미를 일상어로 번역하는 법(예시):
- "편인이 집중을 깨운다" → "혼자 차분히 머리 쓰기 좋은 날"
- "정관격이라 규정을 점검" → "미뤄둔 서류·계약 한 번 더 확인하기 딱 좋아요"
- "겁재 기운이라 지출 주의" → "친구랑 비교하다 충동구매하기 쉬우니 그것만 조심"
- "일지에 합이 들어와 인연운" → "사람과의 만남이 부드럽게 풀리는 날"

규칙:
- one_liner는 20-40자, 친한 친구가 보내주는 한 줄처럼 따뜻하고 쉽게. 오늘 하루의
  '느낌 + 가벼운 한 가지 팁'이 담기되 위 금지어는 절대 안 쓴다.
- "오늘은 좋은 날이야" / "긍정적으로 보내자" 같은 텅 빈 추상문도 금지 — 구체적이되 쉽게.
- 행운 컬러: 빨강·초록·노랑·파랑·검정·흰색·민트 등 일상 색 이름으로.
- 행운 숫자: 1-9 중 하나
- 행운 방향: 동/서/남/북/중앙 중 하나
- 추천 행동 3개는 각각 18-32자, 바로 따라 할 수 있는 구체적 행동을 쉬운 말로.
  예: "점심 먹고 30분 산책하며 머리 식히기" (○) / "정인 시간이라 독서" (✗ — 용어)
- 주의 행동 1-2개는 각각 18-32자, "왜 조심해야 하는지"가 일상어로 살짝 드러나게.
  예: "비교하다 욱해서 충동구매하기 쉬우니 그것만 참기" (○)
- ⚠️ 한 행동 안에 두 가지를 묶을 땐 두 번째도 명사·동사를 끝까지 풀어 의미가 잘리지 않게.
  "친구랑 톡으로 다투거나 충동 결제" (✗ — '결제' 단독이 어색) /
  "친구한테 톡 쏘아붙이거나 즉흥 결제하는 일 조심" (○)
- 두 가지를 매끄럽게 못 묶겠으면 차라리 한 가지로 분명히 쓴다.
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

// daily는 한자를 노출하지 않는다. 프롬프트가 막아도 새어 나오면 마지막 방어.
// "정사(丁巳)" → "정사", "庚子" → "" 처럼 괄호 한자·단독 한자를 제거한다.
function stripHanja(s: string): string {
  return s
    .replace(/[（(]\s*[㐀-鿿]+\s*[)）]/g, '')
    .replace(/[㐀-鿿]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeDaily(raw: unknown): DailyFortuneOutput {
  const value =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const recommend = Array.isArray(value.recommend)
    ? value.recommend
        .map(String)
        .map((v) => stripHanja(v.trim()))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const avoid = Array.isArray(value.avoid)
    ? value.avoid
        .map(String)
        .map((v) => stripHanja(v.trim()))
        .filter(Boolean)
        .slice(0, 2)
    : [];
  const mood = MOOD_ALIASES[String(value.mood ?? '').trim()] ?? 'relaxed';
  const luckyNumber =
    typeof value.lucky_number === 'number'
      ? value.lucky_number
      : Number.parseInt(String(value.lucky_number ?? 7), 10);

  return {
    one_liner: stripHanja(
      String(
        value.one_liner ?? '오늘은 속도를 낮추고 기운을 고르는 날이야',
      ).trim(),
    ),
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
  /** 과거 대화에서 추린 이 사용자의 장기 기억(평문 줄목록, formatUserMemory).
   *  오늘의 한 줄·추천이 이 사람의 실제 하루에 닿게. 비면 순수 일진 운세. */
  memory?: string;
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

  // 장기 기억 → 오늘 운세가 이 사람의 실제 하루(면접·이사·연애 고민 등)에 닿게.
  // 출력엔 기억 인용 흔적을 남기지 않는다 — 사주가 오늘 그 일을 짚은 것처럼.
  const memoryBlock = params.memory?.trim()
    ? `
## 이 사람에 대해 기억하는 것 (과거 대화에서)
${params.memory.trim()}
→ 오늘 일진 분석과 위 기억이 만나는 지점이 있으면 one_liner 또는 recommend 중 1개를 그 실제 상황에 맞춰 쓴다 (예: 면접 앞둔 사람이면 "중요한 자리에선 결론부터 말해봐" 같은 결). 단 "네가 말했던"처럼 기억을 대놓고 인용하지 말고, 오늘 운세가 자연히 그 일을 짚은 것처럼. 기억이 오늘과 무관하면 무시하고 순수 일진 운세로.
`
    : '';

  const userMsg = `오늘은 ${params.date}, 일진은 ${iljiGanKo}${iljiJiKo}(${iljiGanHj}${iljiJiHj})이야.

${context}
${memoryBlock}
## 오늘 일진 × 본인 분석
- 일진 천간↔일간 관계: ${rel.ganSipsung}${rel.hap ? ' (천간합)' : rel.chung ? ' (천간충)' : ''}
- 일진 지지 오행: ${rel.jiOhaeng}
- 사용자 일간 강약: ${analysis.strength.label}, 용신 후보: ${analysis.yongsin.main}
- 진행 중 대운: ${dwLine}
- 올해 세운: ${swLine}

작성 규칙:
- 위 분석은 너의 '속 계산'용 자료일 뿐이다. 사용자에게 보이는 one_liner·recommend·avoid
  에는 일진·일간·대운·세운·십성 같은 용어와 60갑자 이름·한자를 절대 옮겨 적지 말고,
  그 의미만 쉬운 일상어로 번역해 낸다 (system의 ⭐️/🚫 규칙 엄수).
- one_liner는 오늘 하루의 느낌과 가벼운 팁이 담긴, 친구 카톡 같은 쉬운 한 줄.
- lucky_color는 보완하면 좋은 색을 일상 색 이름으로.
- recommend 3개는 오늘 실제로 잘 풀릴 행동을 누구나 바로 따라 할 쉬운 말로.
- avoid는 오늘 자극되기 쉬운 약점을 일상어로 짚어 주의.
- mood는 오늘 흐름과 컨디션을 종합해 happy, excited, surprised, relaxed, thinking, worried 중 하나.
JSON으로만 응답.`;
  const { text } = await complete({
    // 일일운세는 사전계산된 지표를 쉬운 JSON으로 옮기는 단순 작업 → Haiku로 충분(~3x 저렴).
    // 매일 전 유저 cron이라 누적 최대 비용 절감. (system이 유저별로 달라 캐시는 미적용.)
    tier: 'cheap',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 1200,
    responseFormat: 'json_object',
    temperature: 0.5,
  });
  return normalizeDaily(JSON.parse(cleanJson(text)));
}
