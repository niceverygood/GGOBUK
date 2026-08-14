import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { calculatePalja } from '@/lib/saju/palja';
import type { SajuResult } from '@/lib/saju/types';

/**
 * 월별 사주풀이 — 본인 사주 × 그 달에 들어오는 기운.
 *
 * summary(무료 3줄)와 detail(유료 상세)은 **같은 데이터를 다르게 자른 것이 아니라**
 * 역할이 다르다. summary 는 "이번 달이 어떤 달인지" 감만 주고, detail 은 분야별 흐름 ·
 * 구체적 시기 · 실제 행동까지 준다. detail 이 summary 를 길게 늘인 것처럼 읽히면 실패다.
 */

const COMMON_STYLE = `[말투·표기 규칙 — 두 등급 공통]
- 반말. 어미 "~야", "~지", "~네", "~거든". 친근한 친구 톤. 이름이 있으면 "OO아/야".
- 한자(漢字) 완전 금지. "정사(丁巳)", "비견(比肩)" 같은 표기를 절대 쓰지 마라.
- 명리 술어("비견/정관/용신/통근/격국/십성/대운/세운/일간/일지")를 본문에 그대로 쓰지 마라.
  반드시 일상 단어로 풀어쓴다:
  · "비견이 강한 달" → "너랑 비슷한 결의 사람이 자주 엮이는 달"
  · "재성이 들어와" → "돈·결과와 관련된 기운이 들어와"
  · "관성이 눌러" → "책임과 압박이 커지는 흐름이야"
- 단정("반드시", "무조건", "확실히") 금지. 재앙·공포 조장 금지.
- "사주/명리/원국" 단어는 전체에서 3번 이하.
- 컨텍스트에 없는 글자·합·충·신살을 지어내지 마라.`;

const SUMMARY_SYSTEM = `너는 "꼬북점"의 명리 상담가다. 이번 달 운세를 **정확히 3줄**로 요약한다.

${COMMON_STYLE}

[출력 형식 — 엄수]
정확히 3줄. 각 줄은 아래 접두사로 시작한다. 다른 텍스트·헤딩·불릿·번호 금지.

흐름: (이번 달 전체 흐름 한 문장, 35-60자)
기운: (이번 달의 좋은 기운 한 문장, 35-60자)
주의: (가장 조심해야 할 부분 한 문장, 35-60자)

[내용 규칙]
- 세 줄이 서로 다른 이야기를 해야 한다. 같은 말을 바꿔 쓰지 마라.
- "좋은 달이야" 같은 텅 빈 말 금지. 무엇이 어떻게 움직이는지 구체적으로.
- 이건 무료 미끼가 아니라 그 자체로 쓸모 있어야 한다. 단, 분야별 상세·구체적 날짜·
  실행 처방은 상세 풀이의 몫이니 여기서는 다루지 않는다.`;

const DETAIL_SYSTEM = `너는 "꼬북점"의 명리 상담가다. 이번 달 상세 사주풀이 한 편을 쓴다.

${COMMON_STYLE}

[문서 골격 — 아래 H2 8개를 정확히 이 순서·이 제목으로]
## 이번 달 전체 흐름
## 직장과 학업
## 돈의 흐름
## 연애와 관계
## 컨디션과 생활 리듬
## 기운이 강해지는 시기
## 조심해야 하는 시기
## 이번 달의 선택

[섹션별 요구]
- "## 이번 달 전체 흐름": 이 달이 어떤 성격의 달인지. 지난달과 뭐가 달라지는지 한 번은 짚는다.
- "## 직장과 학업" / "## 돈의 흐름" / "## 연애와 관계" / "## 컨디션과 생활 리듬":
  각각 평문 단락 1-2개(4-6문장). 그 분야에서 **이번 달에 실제로 일어나기 쉬운 장면**을
  최소 1개씩 구체적으로 그린다.
- "## 기운이 강해지는 시기" / "## 조심해야 하는 시기":
  **반드시 날짜 구간을 박는다** (예: "8일에서 14일 사이", "월 중순", "말일 무렵").
  왜 그 시기인지 한 줄로 근거를 붙이고, 그때 뭘 하면/피하면 좋은지까지 쓴다.
- "## 이번 달의 선택": 이번 달에 **하면 좋은 행동 3개**와 **피하면 좋은 결정 2개**를
  각각 한 줄씩. 바로 실행 가능한 구체적 행동으로. (이 섹션만 "- " 불릿 허용)

[분량·형식]
- 전체 1,800-2,600자.
- "## 이번 달의 선택" 외의 섹션에서는 표·불릿·볼드 금지. 흐르는 평문만.
- 위에 지정한 8개 외의 헤딩을 만들지 마라.

[상세다움의 기준 — 이게 없으면 실패]
- 무료 3줄 요약을 길게 늘인 것처럼 읽히면 안 된다. 분야별로 **다른 이야기**가 나와야 한다.
- 날짜 구간이 최소 2곳(강해지는 시기·조심하는 시기)에 반드시 박혀 있어야 한다.
- 사용자가 체감으로 검증할 수 있는 구체적 장면이 전체에서 최소 4개.`;

function monthContext(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  // 그 달 15일을 대표 날짜로 삼아 월운(그 달에 들어오는 기운)을 계산한다.
  const mid = `${yearMonth}-15`;
  const pillar = calculatePalja({
    birthDate: mid,
    isLunar: false,
    gender: 'M',
  });
  return `## 이번 달 정보
- 대상 월: ${year}년 ${month}월
- 이번 달에 들어오는 기운(월주): ${pillar.month.gan}${pillar.month.ji} (오행 ${pillar.month.ganOhaeng}/${pillar.month.jiOhaeng})
- 이번 달 중간 지점의 날 기운(일주): ${pillar.day.gan}${pillar.day.ji}
→ 위 달 기운과 아래 사용자 원국이 만나 이번 달 흐름이 만들어진다. 반드시 이 만남을 근거로 삼는다.`;
}

export async function generateMonthlySummary(params: {
  saju: SajuResult;
  yearMonth: string;
  name?: string;
}): Promise<{ content: string; tokensUsed: number; model: string }> {
  const context = formatSajuContext(params.saju, params.name);
  const userMsg = `${monthContext(params.yearMonth)}

${context}

위 사용자의 ${params.yearMonth} 월별 운세를 3줄로 요약해줘.`;

  const r = await complete({
    tier: 'cheap',
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 600,
    temperature: 0.6,
  });
  return { content: r.text.trim(), tokensUsed: r.tokensUsed, model: r.model };
}

export async function generateMonthlyDetail(params: {
  saju: SajuResult;
  yearMonth: string;
  name?: string;
}): Promise<{ content: string; tokensUsed: number; model: string }> {
  const context = formatSajuContext(params.saju, params.name);
  const userMsg = `${monthContext(params.yearMonth)}

${context}

위 사용자의 ${params.yearMonth} 상세 월별 사주풀이를 써줘.
지정된 8개 섹션을 정확히 지키고, 시기 섹션에는 반드시 날짜 구간을 박아라.`;

  const r = await complete({
    tier: 'saju',
    system: DETAIL_SYSTEM,
    cache: true,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 4200,
    temperature: 0.6,
  });
  return { content: r.text.trim(), tokensUsed: r.tokensUsed, model: r.model };
}

// 요약 파서는 src/domain/monthly/summary.ts (순수 모듈) 로 이동했다.
// 클라이언트 컴포넌트가 이 파일을 import 하면 LLM 클라이언트가 번들에 포함되기 때문이다.
export { parseMonthlySummary } from '@/domain/monthly/summary';

/** LLM 실패 시 로컬 폴백 요약 (같은 3줄 형식 유지). */
export function fallbackMonthlySummary(yearMonth: string): string {
  const month = Number(yearMonth.split('-')[1]);
  return [
    `흐름: ${month}월은 새로 벌이기보다 하던 일을 다듬을 때 결과가 붙는 달이야.`,
    '기운: 사람을 통해 기회가 들어오니 먼저 안부를 건네보면 좋아.',
    '주의: 조급한 결정과 충동적인 지출만 한 박자 늦추면 무난하게 흘러가.',
  ].join('\n');
}
