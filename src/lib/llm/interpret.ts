import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

export const INTERPRETATION_CATEGORIES: Array<{
  key: InterpretationCategory;
  title: string;
  prompt: string;
}> = [
  {
    key: 'overview',
    title: '총평',
    prompt: '원국 전체의 온도, 강한 기운, 부족한 기운, 삶의 중심 테마',
  },
  {
    key: 'ohaeng',
    title: '오행 균형',
    prompt:
      '오행 분포가 성향과 컨디션, 관계, 일 처리 방식에 미치는 영향과 보완법',
  },
  {
    key: 'ilju',
    title: '일주 분석',
    prompt: '일주가 보여주는 본질, 자존감, 사랑 방식, 반복되는 선택 패턴',
  },
  {
    key: 'strength',
    title: '타고난 장점',
    prompt: '사주에서 드러나는 강점 3-4가지와 현실에서 빛나는 장면',
  },
  {
    key: 'weakness',
    title: '경계할 점',
    prompt: '주의해야 할 약점, 약점이 드러나는 상황, 개선 방향',
  },
  {
    key: 'personality',
    title: '성격',
    prompt: '내면과 외면의 차이, 감정 처리, 타인에게 보이는 인상',
  },
  {
    key: 'career',
    title: '직업과 적성',
    prompt: '잘 맞는 일의 구조, 조직/프리랜서 성향, 피하면 좋은 업무 방식',
  },
  {
    key: 'wealth',
    title: '재물운',
    prompt: '돈을 모으는 방식, 재물이 새는 패턴, 안정적인 수익 구조',
  },
  {
    key: 'love',
    title: '연애와 결혼',
    prompt:
      '끌리는 사람, 사랑받고 싶은 방식, 궁합이 편한 유형, 반복되는 연애 패턴',
  },
  {
    key: 'family',
    title: '가족 관계',
    prompt: '부모/형제/자녀와의 거리감, 책임감, 가족 안에서 맡기 쉬운 역할',
  },
  {
    key: 'friends',
    title: '대인관계',
    prompt: '친구와 동료 사이에서 생기는 강점, 오해, 좋은 관계 관리법',
  },
  {
    key: 'direction',
    title: '좋은 방향',
    prompt: '활동 방향, 색상, 환경, 루틴 등 기운을 보완하는 생활 조언',
  },
];

const SYSTEM = `너는 "꼬북점"의 대표 명리 상담가다. 사용자의 사주를 깊이 읽어 유료 상담 수준의 개인 리포트를 작성한다.

${PREMIUM_SAJU_GUIDE}

출력 규칙:
- 한국어로만 쓴다. JSON과 코드블록은 쓰지 않는다.
- 제목, 짧은 표, bullet list를 적극 사용해 "근거가 보이는 리포트"처럼 구성한다.
- 첫 블록은 반드시 "한 줄 결론:"으로 시작한다. 2-3문장으로 사용자가 바로 납득할 핵심을 잡는다.
- 다음 순서로 작성한다.
  1) "## 판독 근거 표" 아래에 3행 이상의 마크다운 표를 쓴다. 열은 "사주 근거 | 작용 방식 | 현실 체감"으로 고정한다.
  2) "## 체감 체크포인트" 아래에 사용자가 스스로 맞춰볼 수 있는 구체적 bullet 4-5개를 쓴다.
  3) "## 깊은 풀이" 아래에 3-4개 단락을 쓴다. 각 단락은 원국 근거, 현실 해석, 활용 조언을 함께 담는다.
  4) "## 활용 처방" 아래에 3행 이상의 마크다운 표를 쓴다. 열은 "상황 | 조심할 점 | 써먹는 법"으로 고정한다.
- 표의 각 셀은 35자 안팎으로 짧고 선명하게 쓴다. 모바일에서 읽히도록 과하게 길게 쓰지 않는다.
- 사용자 이름이 있으면 자연스럽게 부른다.
- 명리 술어를 쓸 때는 반드시 한글 뜻을 붙인다. 예: 식신(食神, 표현과 생산성).
- "정확하다"고 주장하지 말고, 계산된 근거와 현실 장면을 촘촘히 연결해 사용자가 체감하도록 만든다.
- 전체 분량은 1,800-2,600자 안팎으로 쓴다.`;

export async function generateInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new Error(`Unknown interpretation category: ${category}`);
  const context = formatSajuContext(saju, name);
  const userMsg = `다음 사주를 "${cat.title}" 관점에서 깊이 풀이해줘.

${context}

중점: ${cat.prompt}

이 카테고리에서는 단순한 성격 설명보다 "왜 이 풀이가 나오는지"가 느껴져야 한다. 사주팔자, 오행 분포, 십성, 신살, 대운 중 실제 근거를 최소 6개 이상 사용해 리포트에 녹여줘.`;
  return complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 3200,
  }).then((r) => ({
    content: r.text,
    tokensUsed: r.tokensUsed,
    model: r.model,
  }));
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

function categoryAngle(category: InterpretationCategory): {
  title: string;
  focus: string;
  scene: string;
  prescription: string;
} {
  const map: Partial<
    Record<
      InterpretationCategory,
      {
        title: string;
        focus: string;
        scene: string;
        prescription: string;
      }
    >
  > = {
    overview: {
      title: '총평',
      focus: '삶 전체를 움직이는 기본 온도와 중심 테마',
      scene: '선택의 순간마다 어떤 기운이 먼저 튀어나오는지',
      prescription: '강한 기운은 일의 동력으로 쓰고 빈 기운은 루틴으로 보완',
    },
    ohaeng: {
      title: '오행 균형',
      focus: '목화토금수의 많고 적음이 만든 체감 온도',
      scene: '컨디션, 관계, 일 처리 속도에서 반복되는 리듬',
      prescription: '부족한 오행을 색, 장소, 사람, 습관으로 보강',
    },
    ilju: {
      title: '일주 분석',
      focus: '일간과 일지가 보여주는 본질과 사랑 방식',
      scene: '자존심, 친밀감, 선택 기준이 드러나는 장면',
      prescription: '일주의 장점은 살리고 예민한 반응은 늦춰 보기',
    },
    strength: {
      title: '타고난 장점',
      focus: '이미 잘하는 능력과 자연스럽게 빛나는 역할',
      scene: '남들이 맡기고 싶어 하는 일과 인정받는 방식',
      prescription: '강점을 의식적으로 반복 가능한 구조로 만들기',
    },
    weakness: {
      title: '경계할 점',
      focus: '과하거나 비어 있는 기운이 만드는 취약한 패턴',
      scene: '피곤할 때 말, 돈, 관계, 선택에서 나타나는 흔들림',
      prescription: '약점을 고치기보다 먼저 알아차리는 장치를 만들기',
    },
    personality: {
      title: '성격',
      focus: '겉으로 보이는 태도와 속마음의 차이',
      scene: '감정을 처리하고 사람을 대하는 기본 방식',
      prescription: '설명하지 않아도 오해가 줄어드는 표현 습관 만들기',
    },
    career: {
      title: '직업과 적성',
      focus: '잘 맞는 일의 구조와 성과가 나는 환경',
      scene: '조직, 독립, 전문성, 표현력 중 어디서 힘이 나는지',
      prescription: '기운이 살아나는 업무 비율을 점점 늘리기',
    },
    wealth: {
      title: '재물운',
      focus: '돈을 모으고 쓰고 지키는 반복 패턴',
      scene: '수입보다 지출 판단과 안정감에서 드러나는 습관',
      prescription: '감정 소비를 줄이고 돈의 흐름을 보이는 곳에 두기',
    },
    love: {
      title: '연애와 결혼',
      focus: '끌리는 사람과 편안한 관계의 차이',
      scene: '확신을 받고 싶을 때와 거리를 두고 싶을 때의 반응',
      prescription: '상대에게 바라는 것을 비난보다 요청으로 말하기',
    },
    family: {
      title: '가족 관계',
      focus: '가족 안에서 맡기 쉬운 역할과 거리감',
      scene: '책임감, 기대, 서운함이 쌓이는 방식',
      prescription: '가족과 나 사이의 경계를 부드럽게 세우기',
    },
    friends: {
      title: '대인관계',
      focus: '친구와 동료에게 비치는 인상과 관계 운',
      scene: '도움이 되는 사람과 에너지를 빼는 사람을 구분하는 감각',
      prescription: '좋은 인연은 자주 확인하고 무거운 인연은 간격 조절',
    },
    direction: {
      title: '좋은 방향',
      focus: '기운을 보완하는 색, 환경, 방향, 루틴',
      scene: '막힐 때 몸과 마음이 다시 풀리는 생활 조건',
      prescription: '작은 환경 조정으로 부족한 기운을 꾸준히 채우기',
    },
  };
  return map[category] ?? map.overview!;
}

function sipsungSummary(saju: SajuResult): string {
  const entries = Object.entries(saju.sipsung)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .slice(0, 4);
  return entries.map(([, value]) => value).join(', ') || '십성 미상';
}

export function generateFallbackInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
): { content: string; tokensUsed: number; model: string } {
  const cat = categoryAngle(category);
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  const { palja } = saju;
  const timePillar = palja.time
    ? `${palja.time.ganHanja}${palja.time.jiHanja}(${palja.time.gan}${palja.time.ji})`
    : '시주 미상';
  const sinsal = saju.sinsal.slice(0, 3);
  const sinsalText =
    sinsal.length > 0
      ? sinsal.map((item) => `${item.name}(${item.position})`).join(', ')
      : '두드러진 주요 신살은 약하게 작용';
  const daewoon = saju.daewoon[0];
  const daewoonText = daewoon
    ? `${daewoon.startAge}세부터 ${daewoon.pillar.ganHanja}${daewoon.pillar.jiHanja} 대운`
    : '대운 정보는 계산 대기';
  const displayName = name?.trim() || '사용자';

  const content = `한 줄 결론: ${displayName}님의 ${cat.title}은 ${strong} 기운이 강하게 체감되고, ${weak} 기운을 의식적으로 보완할 때 균형이 좋아지는 구조입니다. ${cat.focus}을 볼 때 핵심은 일주 ${palja.day.ganHanja}${palja.day.jiHanja}(${palja.day.gan}${palja.day.ji})와 오행 분포의 온도 차이를 함께 읽는 것입니다.

## 판독 근거 표
| 사주 근거 | 작용 방식 | 현실 체감 |
|---|---|---|
| 일주 ${palja.day.ganHanja}${palja.day.jiHanja} | 나의 중심 기질 | 선택 기준과 자존심에 반영 |
| 월주 ${palja.month.ganHanja}${palja.month.jiHanja} | 사회적 리듬 | 일과 관계의 기본 속도 |
| 오행 ${strong} ${strongCount}개 | 강한 체감 온도 | 익숙한 방식으로 먼저 반응 |
| 오행 ${weak} ${weakCount}개 | 보완 지점 | 지치면 결핍으로 드러남 |
| 십성 ${sipsungSummary(saju)} | 역할과 욕구 | 인정받는 방식에 영향 |
| ${sinsalText} | 반복되는 사건성 | 장점과 주의점이 함께 작용 |

## 체감 체크포인트
- ${cat.scene}에서 ${strong} 기운의 속도가 먼저 올라오는 편입니다.
- ${weak} 기운이 약해질수록 판단이 한쪽으로 몰리거나 피로가 빨리 쌓일 수 있습니다.
- 일간 ${saju.ilgan}은 관계에서 “내가 납득해야 움직이는 기준”을 강하게 만듭니다.
- 월지 ${palja.month.jiHanja}(${palja.month.ji})는 사회생활에서 반복되는 감정 온도를 보여줍니다.
- ${timePillar}는 후반부 선택과 생활 리듬을 해석할 때 함께 보아야 합니다.

## 깊은 풀이
${displayName}님의 원국은 연주 ${palja.year.ganHanja}${palja.year.jiHanja}, 월주 ${palja.month.ganHanja}${palja.month.jiHanja}, 일주 ${palja.day.ganHanja}${palja.day.jiHanja}의 조합으로 읽습니다. 여기서 ${strong} 기운이 ${strongCount}개로 가장 강하고 ${weak} 기운은 ${weakCount}개라, 타고난 반응 방식과 실제로 필요한 보완 방식 사이에 차이가 생깁니다. 이 차이가 바로 ${cat.title}에서 반복적으로 느껴지는 핵심 패턴입니다.

십성 흐름은 ${sipsungSummary(saju)} 쪽으로 힘이 모입니다. 십성은 사람의 욕구와 역할을 보여주는 장치라서, 같은 사건을 만나도 어떤 사람은 인정 욕구로, 어떤 사람은 책임감으로, 또 어떤 사람은 표현 욕구로 반응합니다. ${displayName}님은 이 십성 조합 때문에 ${cat.focus}에서 “내가 잘하는 방식”과 “무리하면 흔들리는 방식”이 비교적 분명하게 갈립니다.

신살은 운을 단정하는 표식이라기보다 특정 장면이 반복되는 힌트로 보아야 합니다. ${sinsalText}가 보이면 관계, 일, 감정의 한 장면에서 같은 숙제가 반복될 수 있습니다. 그래서 이 리포트의 핵심은 좋고 나쁨을 가르는 것이 아니라, 반복되는 장면을 먼저 알아차려 선택지를 넓히는 데 있습니다.

대운은 ${daewoonText}처럼 10년 단위의 큰 환경을 보여줍니다. 지금 당장 모든 변화가 한 번에 오지는 않지만, 강한 ${strong} 기운을 생산적인 방향으로 쓰고 부족한 ${weak} 기운을 생활 속에서 채우면 ${cat.title}의 체감 정확도가 훨씬 높아집니다.

## 활용 처방
| 상황 | 조심할 점 | 써먹는 법 |
|---|---|---|
| 결정이 급할 때 | ${strong} 기운으로 과속 | 하루 뒤 다시 확인 |
| 관계가 예민할 때 | ${weak} 기운 결핍 투사 | 요구를 짧게 말하기 |
| 일이 막힐 때 | 익숙한 방식만 반복 | 다른 오행의 환경 빌리기 |
| 컨디션 저하 | 원국의 한쪽 쏠림 | 수면과 루틴 먼저 회복 |
| 운이 바뀌는 시기 | 성급한 단정 | 대운과 세운을 함께 보기 |

${cat.prescription}.`;

  return {
    content,
    tokensUsed: 0,
    model: 'local-fallback',
  };
}

export async function generateAllInterpretations(
  saju: SajuResult,
  name?: string,
): Promise<
  Array<{
    category: InterpretationCategory;
    content: string;
    tokensUsed: number;
    model: string;
  }>
> {
  const results = await Promise.all(
    INTERPRETATION_CATEGORIES.map(async (cat) => {
      const r = await generateInterpretation(saju, cat.key, name);
      return {
        category: cat.key,
        content: r.content,
        tokensUsed: r.tokensUsed,
        model: r.model,
      };
    }),
  );
  return results;
}
