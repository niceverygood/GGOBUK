import { complete } from "./client";
import { formatSajuContext } from "./prompts/saju_context";
import { PREMIUM_SAJU_GUIDE } from "./prompts/premium_saju";
import { calculatePalja } from "@/lib/saju/palja";
import { sipsungOf } from "@/lib/saju/sipsung";
import {
  CHEONGAN_OHAENG_IDX,
  CHEONGAN_YINYANG,
} from "@/lib/saju/constants";
import { logger } from "@/lib/utils/logger";
import type { SajuResult, DaewoonPeriod } from "@/lib/saju/types";

function sewoonForRange(saju: SajuResult, startYear: number): string[] {
  const lines: string[] = [];
  const ilganIdx = saju.palja.day.ganIdx;
  for (let y = startYear; y < startYear + 10; y++) {
    const yearPillar = calculatePalja({
      birthDate: `${y}-04-01`,
      isLunar: false,
      gender: 'M',
    }).year;
    const sipsung = sipsungOf(
      CHEONGAN_OHAENG_IDX[ilganIdx],
      CHEONGAN_YINYANG[ilganIdx],
      CHEONGAN_OHAENG_IDX[yearPillar.ganIdx],
      CHEONGAN_YINYANG[yearPillar.ganIdx],
    );
    lines.push(`${y}: ${yearPillar.ganHanja}${yearPillar.jiHanja} (${sipsung})`);
  }
  return lines;
}

const SYSTEM = `너는 대운 흐름을 현실 언어로 풀어주는 꼬북점 명리 상담가다.
${PREMIUM_SAJU_GUIDE}

## ⚠️ 마크다운 절대 금지 — 일반 텍스트로만
이 카드는 마크다운을 렌더링하지 않는다. 마크다운 기호를 쓰면 사용자에겐
그대로 깨진 기호로 보인다. 다음 기호 전부 금지:
- ❌ #, ##, ### 헤딩 (절대 ### 1., ### 2. 같은 섹션 나누기 금지)
- ❌ **굵게**, *기울임*
- ❌ > 인용 블록
- ❌ --- 또는 ___ 구분선
- ❌ -, *, 1) 같은 불릿/번호 마커
- ❌ 표 (|---|)
- ❌ \`백틱\`

대신 자연스러운 한국어 단락으로만 쓴다. 단락 구분이 필요하면 빈 줄(엔터 두 번)만 사용한다. 강조하고 싶으면 한국어 어휘로("핵심은", "주의할 점은").

## 구조 (마크다운 헤딩 없이)
- 총 2-3 단락, 각 단락 4-6문장.
- 1단락: 대운 천간/지지가 일간을 어떻게 자극했는지 (근거 → 작용 방식)
- 2단락: 그 10년의 세운 흐름에서 두드러진 변화 시점 (현실 체감)
- 3단락: 처방·돌아보기 질문으로 마무리
- 단락 사이는 빈 줄 한 번으로 구분. 헤딩이나 번호 매기지 마라.

## 톤·표현
- 단정하지 말고 "~했을 수 있다", "~의 시기였을 가능성이 높다" 어투
- 대운 천간/지지, 십성, 원국의 강한 기운과 부족한 기운을 연결한다
- 너무 구체적인 사건을 맞히려 하지 말고 삶의 흐름, 감정, 관계, 일/공부의 변화 위주로 추정한다
- 마지막 문장은 그 시기를 돌아보는 질문이나 해석 포인트로 마무리한다
- 부정적 표현은 최소화하고, 힘든 흐름도 성장의 언어로 바꿔준다`;

function strongestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => b[1] - a[1])[0] as [
    keyof SajuResult["ohaengCount"],
    number,
  ];
}

function weakestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => a[1] - b[1])[0] as [
    keyof SajuResult["ohaengCount"],
    number,
  ];
}

export function generateFallbackColdRead(params: {
  saju: SajuResult;
  daewoon: DaewoonPeriod;
  name?: string;
}): string {
  const { saju, daewoon } = params;
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  const startAge = daewoon.startAge;
  const endAge = daewoon.startAge + 9;
  const startYear = daewoon.startYear;
  const endYear = daewoon.startYear + 9;
  const pillar = `${daewoon.pillar.ganHanja}${daewoon.pillar.jiHanja}`;
  const name = params.name?.trim() ? `${params.name.trim()}님` : "이 시기";

  return `${startYear}-${endYear}년, ${startAge}-${endAge}세의 ${pillar} 대운은 ${name}에게 ${daewoon.sipsung}의 주제가 크게 깔리는 10년 흐름입니다. 원국에서는 ${strong} 기운이 ${strongCount}개로 비교적 강하고 ${weak} 기운이 ${weakCount}개로 약하게 잡히기 때문에, 이 대운은 이미 잘 쓰던 힘을 더 크게 드러내면서도 부족한 기운을 생활 속에서 보완하는 방식으로 읽는 편이 좋습니다. 대운 천간 ${daewoon.pillar.ganHanja}은 바깥으로 보이는 선택과 태도에 영향을 주고, 지지 ${daewoon.pillar.jiHanja}는 오래 깔리는 감정, 관계, 일의 리듬에 영향을 주는 자리입니다. 그래서 이 시기에는 갑작스러운 사건 하나보다 반복되는 선택 패턴, 오래 끌고 가는 관계, 공부나 일에서 방향을 잡는 방식이 더 중요했을 가능성이 높습니다. ${daewoon.sipsung} 대운은 내가 무엇을 지키고 무엇을 확장할지 묻는 흐름이므로, 성급히 결론내리기보다 그때 자주 반복됐던 고민과 선택을 같이 보면 해석이 더 선명해집니다. 돌아본다면 “그 10년 동안 내가 가장 많이 붙잡았던 것과 놓아야 했던 것은 무엇이었나?”를 기준으로 보면 이 대운의 의미가 가장 잘 드러납니다.`;
}

export async function generateColdRead(params: {
  saju: SajuResult;
  daewoon: DaewoonPeriod;
  name?: string;
}): Promise<string> {
  const context = formatSajuContext(params.saju, params.name);
  const sewoonList = sewoonForRange(params.saju, params.daewoon.startYear);
  const userMsg = `${context}

## 추정 대상 대운
${params.daewoon.startYear}년~${params.daewoon.startYear + 9}년 (${params.daewoon.startAge}세~${params.daewoon.startAge + 9}세)
대운 간지: ${params.daewoon.pillar.ganHanja}${params.daewoon.pillar.jiHanja} (${params.daewoon.sipsung})

## 그 10년의 세운 흐름 (해마다 일간 기준 십성)
${sewoonList.map((s) => `- ${s}`).join('\n')}

작성 규칙:
- 마크다운 헤딩(###)·구분선(---)·볼드(**) 절대 금지. 평문 단락으로만.
- 단락 2-3개, 각 4-6문장. 단락 사이 빈 줄 한 번.
- 대운 천간/지지가 일간 ${params.saju.ilgan}을 어떻게 자극했는지 첫 단락에서.
- 위 세운 목록에서 십성이 크게 바뀌는 해가 있다면 둘째 단락에서 "이 즈음 어떤 변화가 있었을 가능성"을 한 줄로.
- 단정 금지. "~했을 가능성", "~의 시기였을 수 있다" 어투.
- 마지막 단락은 돌아보는 질문이나 처방으로 마무리.`;
  try {
    const { text } = await complete({
      tier: "saju",
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 1400,
      temperature: 0.5,
    });
    return text;
  } catch (error) {
    logger.error("coldread", "llm failed; using fallback", {
      startYear: params.daewoon.startYear,
      message: error instanceof Error ? error.message : String(error),
    });
    return generateFallbackColdRead(params);
  }
}
