import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import { HANJA_NOTATION_RULE } from './prompts/hanja_rule';
import { pairwiseSummary } from '@/lib/saju/hapchung';
import { analyzeSaju } from '@/lib/saju/analysis';
import type { Palja, Pillar, SajuResult } from '@/lib/saju/types';
import type { CompatibilityResult } from '@/types/db';

function pairInteractions(a: Palja, b: Palja): string[] {
  // Cross-chart pillar-level hap/chung detection. Mirrors hapchung.ts pair logic
  // for every (pillar of A, pillar of B) combination.
  const ganHap: Array<[number, number]> = [[0,5],[1,6],[2,7],[3,8],[4,9]];
  const ganChung: Array<[number, number]> = [[0,6],[1,7],[2,8],[3,9]];
  const jiYukhap: Array<[number, number]> = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
  const jiChung: Array<[number, number]> = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
  const jiHyeong: Array<[number, number]> = [
    [2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3],
  ];

  const pairsA: Array<{ pos: string; p: Pillar }> = [
    { pos: 'A연', p: a.year }, { pos: 'A월', p: a.month }, { pos: 'A일', p: a.day },
    ...(a.time ? [{ pos: 'A시', p: a.time }] : []),
  ];
  const pairsB: Array<{ pos: string; p: Pillar }> = [
    { pos: 'B연', p: b.year }, { pos: 'B월', p: b.month }, { pos: 'B일', p: b.day },
    ...(b.time ? [{ pos: 'B시', p: b.time }] : []),
  ];

  const has = (pairs: Array<[number, number]>, x: number, y: number) =>
    pairs.some(([m, n]) => (m === x && n === y) || (m === y && n === x));

  const lines: string[] = [];
  for (const x of pairsA) {
    for (const y of pairsB) {
      if (has(ganHap, x.p.ganIdx, y.p.ganIdx)) {
        lines.push(`${x.pos}간 ${x.p.ganHanja} ↔ ${y.pos}간 ${y.p.ganHanja} 천간합`);
      }
      if (has(ganChung, x.p.ganIdx, y.p.ganIdx)) {
        lines.push(`${x.pos}간 ${x.p.ganHanja} ↔ ${y.pos}간 ${y.p.ganHanja} 천간충`);
      }
      if (has(jiYukhap, x.p.jiIdx, y.p.jiIdx)) {
        lines.push(`${x.pos}지 ${x.p.jiHanja} ↔ ${y.pos}지 ${y.p.jiHanja} 지지육합`);
      }
      if (has(jiChung, x.p.jiIdx, y.p.jiIdx)) {
        lines.push(`${x.pos}지 ${x.p.jiHanja} ↔ ${y.pos}지 ${y.p.jiHanja} 지지충`);
      }
      if (has(jiHyeong, x.p.jiIdx, y.p.jiIdx)) {
        lines.push(`${x.pos}지 ${x.p.jiHanja} ↔ ${y.pos}지 ${y.p.jiHanja} 지지형`);
      }
    }
  }
  return lines.slice(0, 12); // cap so prompt doesn't blow up
}

const SYSTEM = `너는 "꼬북점"의 대표 명리 상담가다. 두 사람의 사주를 깊이 읽어 프리미엄 궁합 리포트를 작성한다.

${PREMIUM_SAJU_GUIDE}

${HANJA_NOTATION_RULE}

상담 톤:
- 한국어로만 쓴다.
- 실제 유료 상담처럼 구체적이고 길게 쓴다.
- 따뜻하고 몰입감 있는 비유를 쓰되, 반드시 사주 근거(일간, 일주, 오행 분포, 십성, 신살, 대운, 합/충)를 함께 설명한다.
- 이름을 자연스럽게 부른다. "사람 A/B"라는 표현은 피한다.
- 관계 라벨이 있으면 연인, 친구, 가족, 동료 등 맥락에 맞춰 해석한다.
- 단정적 예언 대신 "경향", "가능성", "주의하면 좋은 점"으로 표현한다.
- 의료, 법률, 투자 판단처럼 현실 결정을 대신하는 조언은 하지 않는다.
- 노골적인 성적 표현, 혐오, 위협, 불안을 과도하게 조장하는 표현은 쓰지 않는다.
- 제공된 사주 정보에 없는 합/충/신살을 사실처럼 새로 만들어내지 않는다. 추론은 "이런 흐름으로 볼 수 있다"처럼 설명한다.

[두 사람 비교 의무]
- 각 sections.body는 반드시 A와 B 양쪽의 일주(60갑자), 일간 강약, 격국, 용신, 가장 강한 십성 그룹을 함께 인용한다.
- "이름A의 OO 일주는 ~한 결이고, 이름B의 OO 일주는 ~한 결이라 만나면 ~한 장면이 자주 나온다" 형식의 비교가 단락마다 한 번 이상.
- 일반론(서로 다른 사람을 이해해야 해요 등) 금지. 두 사주의 구체적 차이/닮음에서 출발해 풀어 쓴다.

출력 규칙:
- 유효한 JSON 객체만 답한다. 마크다운, 코드블록, 주석, 앞뒤 설명 금지.
- score는 0-100 정수다. 서로 보완이 강하면 높게, 충돌만 강하면 낮게, 보완과 긴장이 함께 있으면 70-89 사이로 균형 있게 준다.
- hap/chung은 계산된 합/충을 우선 반영한다. 뚜렷하지 않으면 [].
- highlights/cautions는 각각 3-4개, 한 줄짜리 핵심 문장으로 쓴다. 각 줄에 사주 글자/십성/오행 근거를 한 번 이상 박는다.
- headline은 28-55자 사이의 강한 한 문장이다.
- metaphor는 관계를 이미지로 보여주는 1문장이다.
- verdict는 점수 해석 1문장이다.
- summary는 5-7문장으로 관계 전체를 요약한다. 두 사람의 일주를 한 번씩 인용한다.
- sections는 정확히 8개를 쓴다. 각 body는 4-6문장, 380-650자 분량의 밀도 있는 단락이다.
- 전체 리포트는 3,500자 안팎의 충분한 읽을거리가 있어야 한다. 짧은 문장 나열 대신 사주 근거와 관계 해석을 한 단락 안에서 충분히 연결한다.
- actionTips는 관계를 좋게 만드는 실천 조언 5개다. 각 조언에 "왜"(어떤 합/충/십성 때문인지)와 "어떻게"(오늘부터 무엇을)를 함께 적는다.

JSON 형태:
{
  "score": 0,
  "headline": "",
  "metaphor": "",
  "verdict": "",
  "hap": [],
  "chung": [],
  "highlights": [],
  "cautions": [],
  "summary": "",
  "sections": [
    { "title": "오행의 온도와 첫인상", "body": "" },
    { "title": "서로의 결핍을 채우는 방식", "body": "" },
    { "title": "끌림과 정서적 교감", "body": "" },
    { "title": "함께할 때 커지는 장점", "body": "" },
    { "title": "충돌이 생기는 지점", "body": "" },
    { "title": "관계를 오래 끌고 가는 법", "body": "" },
    { "title": "서로가 진짜 바라는 것", "body": "" },
    { "title": "개운 조언", "body": "" }
  ],
  "actionTips": []
}`;

const JSON_REPAIR_SYSTEM = `너는 JSON 복구 도구다.
규칙:
- 사용자가 준 텍스트의 의미와 문장을 최대한 유지한다.
- 깨진 쉼표, 괄호, 따옴표, 배열 닫힘만 고쳐 유효한 JSON 객체로 만든다.
- 없는 내용을 새로 길게 추가하지 않는다.
- 마크다운 없이 JSON 객체만 답한다.`;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).filter(Boolean).slice(0, 8)
    : [];
}

function clampScore(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function cleanJson(text: string): string {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) return cleaned.slice(first, last + 1);
  return cleaned;
}

function parseCompatibilityJson(text: string): CompatibilityResult {
  return normalizeCompatibilityResult(JSON.parse(cleanJson(text)));
}

function normalizeCompatibilityResult(raw: unknown): CompatibilityResult {
  const value =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sections = Array.isArray(value.sections)
    ? value.sections
        .map((section) => {
          if (!section || typeof section !== 'object') return null;
          const item = section as Record<string, unknown>;
          const title = asString(item.title);
          const body = asString(item.body);
          return title && body ? { title, body } : null;
        })
        .filter((section): section is { title: string; body: string } =>
          Boolean(section),
        )
        .slice(0, 10)
    : [];

  return {
    score: clampScore(value.score),
    hap: asStringArray(value.hap),
    chung: asStringArray(value.chung),
    highlights: asStringArray(value.highlights),
    cautions: asStringArray(value.cautions),
    summary: asString(value.summary),
    headline: asString(value.headline) || undefined,
    metaphor: asString(value.metaphor) || undefined,
    verdict: asString(value.verdict) || undefined,
    sections: sections.length ? sections : undefined,
    actionTips: asStringArray(value.actionTips),
  };
}

async function parseOrRepairCompatibility(
  text: string,
): Promise<CompatibilityResult> {
  try {
    return parseCompatibilityJson(text);
  } catch (firstError) {
    const { text: repaired } = await complete({
      tier: 'compat',
      system: JSON_REPAIR_SYSTEM,
      messages: [{ role: 'user', content: text.slice(0, 20000) }],
      maxTokens: 5200,
      responseFormat: 'json_object',
    });
    try {
      return parseCompatibilityJson(repaired);
    } catch {
      throw firstError;
    }
  }
}

export async function generateCompat(params: {
  sajuA: SajuResult;
  sajuB: SajuResult;
  nameA?: string;
  nameB?: string;
  relationLabel?: string;
}): Promise<CompatibilityResult> {
  const { hap, chung } = pairwiseSummary(
    params.sajuA.palja,
    params.sajuB.palja,
  );
  const allPairInteractions = pairInteractions(
    params.sajuA.palja,
    params.sajuB.palja,
  );
  const analysisA = analyzeSaju(params.sajuA);
  const analysisB = analyzeSaju(params.sajuB);

  const userMsg = `[사람 A]
${formatSajuContext(params.sajuA, params.nameA)}

[사람 B]
${formatSajuContext(params.sajuB, params.nameB)}

관계: ${params.relationLabel ?? '미지정'}

## 두 사주 사이의 핵심 작용
- 일주 합/충: 합 ${hap.join(', ') || '없음'} / 충 ${chung.join(', ') || '없음'}
- 모든 자리 간 합·충·형 (감지된 것):
${allPairInteractions.length > 0 ? allPairInteractions.map((l) => `  · ${l}`).join('\n') : '  · 두드러진 합/충 없음'}

## 두 사람의 기본 골격
- A: ${analysisA.gyeokguk.primary}, ${analysisA.strength.label}, 용신 ${analysisA.yongsin.main}
- B: ${analysisB.gyeokguk.primary}, ${analysisB.strength.label}, 용신 ${analysisB.yongsin.main}

작성 규칙:
- score는 위 합/충/형 결과와 두 사람의 격국·용신 보완 정도를 정량적으로 반영해 정한다.
  · 일주 합 + 일주 오행 보완 + 용신 보완이 겹치면 85–95.
  · 합과 충이 비슷하게 섞이면 60–79.
  · 일주 충 + 격국 충돌 + 용신 반대면 35–55.
- hap/chung 필드에는 위의 "모든 자리 간 합·충·형" 중 가장 의미 있는 것을 자연어로 적는다 (예: "일지 사해충", "월간 정임합").
- 각 섹션 body는 두 사람의 사주 글자/십성/격국/용신을 이름과 함께 인용한다.
- 일반론(좋은 사람, 사랑이 중요해요 등) 금지.
- 모든 자리 간 합·충·형 목록에 없는 합/충을 새로 만들어 인용하지 않는다.

위 정보를 바탕으로 앱 사용자가 저장하고 다시 읽고 싶을 만큼 깊고 풍부한 궁합 리포트를 JSON으로 작성해줘.`;
  const { text } = await complete({
    tier: 'compat',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 6000,
    responseFormat: 'json_object',
    temperature: 0.4,
  });
  return parseOrRepairCompatibility(text);
}
