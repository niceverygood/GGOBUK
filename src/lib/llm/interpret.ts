import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import { analyzeSaju } from '@/lib/saju/analysis';
import {
  findFutureClashes,
  formatClashTriggers,
} from '@/lib/saju/clash_timing';
import type { SajuResult } from '@/lib/saju/types';

// ─── 단일 전체 풀이 ──────────────────────────────────────────────────────────
// v1 단순화(2026-08-10): 12개 카테고리 × 4페르소나 → "전체 풀이 한 편" 하나.
// DB의 interpretations.category CHECK 제약과 호환되도록 기존 키 'overview'에
// 저장한다 (마이그레이션 불필요). 페르소나는 꼬북이로 고정.

export const READING_CATEGORY = 'overview' as const;
export const READING_PERSONA = 'kkobuk' as const;

/** 남은 소비처(미리보기 페이지) 호환용 — 이제 항목은 하나뿐이다. */
export const INTERPRETATION_CATEGORIES = [
  {
    key: READING_CATEGORY,
    title: '내 사주 전체 풀이',
    prompt:
      '성격·강점·그늘·일과 돈·사랑·지금의 흐름까지, 사주 전체를 한 편의 리포트로 풀어준다.',
  },
] as const;

const READING_STYLE = `[꼬북이 전체 풀이 — 친근한 친구 톤]

⭐ 독자: 사주 지식이 전혀 없는 일반인. 명리 술어를 들으면 "그게 뭐예요?" 하는 사람.

말투:
- 반말. 어미 "~야", "~지", "~네", "~거든". 친근하고 따뜻하게.
- 이름이 있으면 "OO아/야", 없으면 "너". 권위 잡지 말 것.

한자/명리 술어 (강한 룰):
- 한자(漢字) 완전 금지. "정사(丁巳)", "비견(比肩)" 같은 한자 표기 절대 쓰지 마라.
- "비견", "정관", "용신", "통근", "격국", "십성", "대운", "세운" 같은 명리 술어를
  본문에 그대로 쓰지 마라. 반드시 일상 단어로 풀어쓴다:
  · "비견 3개" → "너랑 비슷한 결의 사람이 잘 모이는 사주야"
  · "용신 수(水)" → "물 기운이 너를 살리는 핵심"
  · "재성" → "돈·결과를 추구하는 결" / "관성" → "책임감을 짊어지는 결"
  · "대운/세운" → "지금 들어와 있는 10년 흐름 / 올해의 흐름"
- 어떤 술어라도 등장하면 그 직후에 일상 단어로 풀이 의무.

구조 (이 문서 전용 — 아래 섹션 헤딩은 글자 그대로 지킨다):
- 첫 줄: 시적이고 캐치한 한 줄 헤드라인 (헤딩 마커 없이 그냥 한 줄).
- 그 다음 "## 한눈에" 콜아웃 블록 (형식은 시스템 규칙 참조).
- 이후 본문은 아래 6개 섹션을 정확히 이 순서·이 제목의 마크다운 H2로 쓴다:
  ## 나라는 사람
  ## 타고난 강점
  ## 조심할 그늘
  ## 일과 돈
  ## 사랑과 관계
  ## 지금의 흐름
- 각 섹션은 흐르는 평문 단락 1-2개 (각 4-7문장). 섹션 안에서 표·불릿·볼드 금지.
- "## 지금의 흐름" 섹션에는 구체 연도가 박힌 포인트를 최소 1개 넣는다
  (예: "2027년쯤엔 …"). 단정·재앙 표현 금지, 알아차리는 장치로.
- 마지막 섹션 뒤에 "오늘부터 하나:" 로 시작하는 한 줄 — 오늘 당장 해볼 수 있는
  작은 행동 한 가지로 마무리.

분량: 전체 2,500-3,500자 안팎.

금지:
- 위에 허용된 것 외의 헤딩·표·불릿·볼드.
- "정확히", "반드시" 같은 단정. 재앙·불안 조장.
- "사주", "명리", "원국" 단어 과다 사용 (전체에 5번 이하).`;

const SYSTEM = `너는 "꼬북점"의 명리 상담가다. 30년차 자평명리·격국용신론 학파의 상담가로, 사용자의 사주를 깊이 읽어 유료 상담 수준의 개인 리포트를 작성한다. 말투는 캐주얼한 친구(꼬북이)다.

${READING_STYLE}

${PREMIUM_SAJU_GUIDE}

[근거 의무 — 매우 중요]
- 입력 컨텍스트의 "## 일주 60갑자 명조", "## 일간 강약", "## 격국", "## 용신 후보", "## 통근/투출", "## 원국 내 합·충·형·파·회", "## 진행 중 흐름", "## 음양 비율" 섹션을 반드시 활용한다.
- 단락마다 최소 하나의 사주 글자/십성/오행/분석 결과를 근거로 삼되, 노출은 반드시 일상어로 풀어쓴다.
- 컨텍스트에 없는 합·충·신살을 새로 만들어 인용하지 않는다.

[한눈에 블록 — 형식 엄수]
첫 헤드라인 직후에 반드시 아래 블록을 넣는다. 이 블록만은 마크다운 H2 + bullet 3개 형식을 정확히 지킨다 — 클라이언트가 이 시그니처로 찾아 콜아웃 카드로 렌더한다.

  ## 한눈에
  - 🔑 키워드: 이 사주를 한 줄로 정의하는 결정적 특징 3개를 슬래시(/)로 구분.
  - ✅ 이렇게 해봐: 오늘부터 바로 실천할 수 있는 행동 2개를 한 줄씩. 추상 조언 금지.
  - ⚠️ 이건 조심: 그늘이 나타나는 구체적인 상황·행동 1-2개.

[표현 규칙]
- "정확하다"고 주장하지 말고, 계산된 근거와 현실 장면을 촘촘히 연결해 사용자가 체감하도록 만든다.`;

/** 십성 개수 집계 헬퍼. */
function sipsungCounts(saju: SajuResult) {
  const allValues = Object.values(saju.sipsung).filter(Boolean) as string[];
  const countOf = (...names: string[]) =>
    allValues.filter((v) => names.includes(v)).length;
  return {
    inseong: countOf('정인', '편인'),
    jaeseong: countOf('정재', '편재'),
    gwanseong: countOf('정관', '편관'),
    sikSang: countOf('식신', '상관'),
    bigeop: countOf('비견', '겁재'),
  };
}

/**
 * 사전 계산된 핵심 신호 — LLM이 놓치기 쉬운 결정적 데이터를 user 메시지에
 * 미리 못박아 넣는다 (십성 과다 패턴 + 향후 충·형 재발동 시점).
 */
function readingSignals(saju: SajuResult): string {
  const c = sipsungCounts(saju);
  const analysis = analyzeSaju(saju);
  const lines: string[] = ['## 전체 풀이 핵심 신호 (사전 계산)'];

  if (analysis.gyeokguk.primary !== '미상') {
    lines.push(`- 격국 ${analysis.gyeokguk.primary} → 사주의 골격이 만든 자아의 결`);
  }
  if (c.bigeop >= 4)
    lines.push('- ⚠️ 비겁 과다: 자존심·경쟁심·외로움이 동시에 강함. "내가 더 했는데" 싶은 갈등 반복.');
  if (c.sikSang >= 4)
    lines.push('- ⚠️ 식상 과다: 말·표현 많아 매력적이나 다 말하고 나서 후회 반복.');
  if (c.gwanseong >= 4)
    lines.push('- ⚠️ 관성 과다: 책임·압박을 자기도 모르게 끌어안는 자리.');
  if (c.inseong >= 4)
    lines.push('- ⚠️ 인성 과다: 준비·공부 늘리다가 시작 못 하는 자리. "70% 알면 시작"의 룰 필요.');
  if (c.jaeseong === 0)
    lines.push('- ⚠️ 무재 사주: 돈 자체보다 일·표현의 결과로 돈이 따라오는 구조. 직접 재테크 몰입은 소모.');

  const clashes = findFutureClashes(saju, { yearsAhead: 5, daewoonAhead: 3 });
  if (clashes.length > 0) {
    lines.push('', formatClashTriggers(clashes, { maxLines: 6 }));
  }

  lines.push(
    '',
    '→ ⚠️ 표시 신호는 "조심할 그늘" 섹션에서, 충·형 재발동 시점 중 하나는 "지금의 흐름" 섹션에서 반드시 직접 풀어 쓴다. 단정·재앙 표현 금지.',
  );
  return lines.join('\n');
}

/** 전체 풀이 한 편 생성 — 꼬북이 톤, 섹션 6개 + 한눈에 콜아웃. */
export async function generateFullReading(
  saju: SajuResult,
  name?: string,
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const context = formatSajuContext(saju, name);
  const signals = readingSignals(saju);

  const userMsg = `다음 사주의 "전체 풀이" 리포트를 한 편으로 써줘.

${context}

${signals}

작성 요구:
- 스타일 가이드의 섹션 구조(한 줄 헤드라인 → ## 한눈에 → 6개 섹션 → 오늘부터 하나)를 정확히 지킨다.
- 섹션마다 위 컨텍스트의 근거를 최소 하나씩 실제로 인용하되, 일상어로 풀어 쓴다.
- 사용자가 체감으로 검증할 수 있는 행동/감정 장면을 전체에서 최소 5개 포함한다.
- "왜 이 풀이가 나오는지"가 매 단락에서 느껴져야 한다.`;

  const r = await complete({
    tier: 'saju',
    system: SYSTEM,
    cache: true,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 5000,
    temperature: 0.6,
  });
  return { content: r.text, tokensUsed: r.tokensUsed, model: r.model };
}

function strongestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => b[1] - a[1])[0] as [
    string,
    number,
  ];
}

function weakestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => a[1] - b[1])[0] as [
    string,
    number,
  ];
}

function sipsungSummary(saju: SajuResult): string {
  const entries = Object.entries(saju.sipsung)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .slice(0, 4);
  return entries.map(([, value]) => value).join(', ') || '십성 미상';
}

/** LLM 호출 실패 시의 로컬 폴백 — 같은 섹션 구조의 짧은 평문 리포트. */
export function generateFallbackReading(
  saju: SajuResult,
  name?: string,
): { content: string; tokensUsed: number; model: string } {
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  const { palja } = saju;
  const displayName = name?.trim() || '너';
  const daewoon = saju.daewoon[0];
  const daewoonText = daewoon
    ? `${daewoon.startAge}세부터 시작된 10년 단위의 큰 흐름`
    : '10년 단위의 큰 흐름';

  const content = `${strong} 기운이 앞장서고 ${weak} 기운을 채워갈 때 균형이 잡히는 사주야.

## 한눈에
- 🔑 키워드: ${strong} 기운의 추진력 / ${weak} 기운의 빈자리 / 나답게 가는 균형
- ✅ 이렇게 해봐: 오늘 결정할 일이 있으면 하루만 묵혀보기. 지치기 전에 쉬는 시간을 먼저 달력에 적어두기.
- ⚠️ 이건 조심: 익숙한 방식으로만 밀어붙이다 지치는 순간.

## 나라는 사람
${displayName}의 중심에는 ${strong} 기운이 ${strongCount}개로 가장 강하게 자리 잡고 있어. 그래서 어떤 상황에서든 익숙한 반응이 먼저 튀어나오는 편이고, 그게 ${displayName}만의 속도와 색을 만들어. 반대로 ${weak} 기운은 ${weakCount}개라, 지칠 때는 그 빈자리가 먼저 느껴질 수 있어.

## 타고난 강점
강한 ${strong} 기운은 일을 시작하고 밀고 나가는 동력이야. 주변에서 "${displayName}은 이런 건 참 잘해"라고 하는 지점이 대부분 여기서 나와. 이 결을 부정하지 말고 생산적인 방향으로 쓰는 게 핵심이야.

## 조심할 그늘
${weak} 기운이 약해질수록 판단이 한쪽으로 몰리거나 피로가 빨리 쌓일 수 있어. 무리하고 있다는 신호가 오면, 잘하는 방식을 더 세게 미는 대신 잠깐 멈추는 연습이 필요해.

## 일과 돈
일에서는 익숙한 방식(${strong})이 성과를 내지만, 돈은 리듬 관리에서 갈려. 컨디션이 무너지면 지출도 같이 흔들리는 타입이라, 생활 루틴을 먼저 잡으면 돈 흐름도 따라와.

## 사랑과 관계
관계에서 ${displayName}은 "내가 납득해야 움직이는 기준"이 분명한 편이야. 그 기준이 매력이 되기도 하고, 상대에겐 벽처럼 느껴지기도 해. 요구는 짧게, 마음은 자주 말하는 게 좋아.

## 지금의 흐름
지금은 ${daewoonText} 위에 있어. 큰 변화를 서두르기보다, 강한 ${strong} 기운을 일의 동력으로 쓰고 빈 ${weak} 기운을 루틴으로 채우는 시기로 보면 돼. 일주 ${palja.day.gan}${palja.day.ji}의 결은 평생 안 변하니까, 흐름이 바뀌어도 중심은 그대로야.

오늘부터 하나: 오늘 해야 할 일 중 하나만 골라서, 평소보다 반 박자 천천히 해보기.`;

  return { content, tokensUsed: 0, model: 'local-fallback' };
}
