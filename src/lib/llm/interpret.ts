import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

export const INTERPRETATION_CATEGORIES: Array<{
  key: InterpretationCategory;
  title: string;
  prompt: string;
  anchors: string[];
}> = [
  {
    key: 'overview',
    title: '총평',
    prompt: '격국·일간 강약·강한/부족한 오행을 중심으로 삶의 기본 온도와 핵심 테마를 잡는다.',
    anchors: ['격국', '일간 강약', '용신 후보', '강한 오행', '부족한 오행', '진행 중 대운'],
  },
  {
    key: 'ohaeng',
    title: '오행 균형',
    prompt:
      '오행 분포가 컨디션·관계·일 처리에서 어떻게 결핍/과잉으로 드러나는지, 색·환경·습관으로 보완하는 방법까지.',
    anchors: ['오행 분포', '용신 후보', '통근', '부족한 오행이 드러나는 생활 장면'],
  },
  {
    key: 'ilju',
    title: '일주 분석',
    prompt:
      '일간(나)+일지(배우자궁)의 조합으로 본질, 자존감, 사랑 방식, 반복되는 선택 패턴을 푼다.',
    anchors: ['일주 60갑자 특성', '일지 십이운성(자존감 단계)', '일지=배우자궁 의미', '일간 통근', '도화·천을귀인 매칭'],
  },
  {
    key: 'strength',
    title: '타고난 장점',
    prompt:
      '격국·십성·강한 오행을 짝지어 자연스럽게 빛나는 3-4가지 강점과 현실에서 발휘되는 장면을 적는다.',
    anchors: ['격국', '강한 십성', '천간 투출', '용신과 일치하는 강점'],
  },
  {
    key: 'weakness',
    title: '경계할 점',
    prompt:
      '약한 오행, 격국의 그늘, 충·형·파·공망이 만드는 취약 패턴과 알아차리는 장치를 만든다.',
    anchors: ['부족한 오행', '신살(특히 공망·백호·역마)', '원국 내 충·형', '대운에서 흔들리는 시기'],
  },
  {
    key: 'personality',
    title: '성격',
    prompt:
      '일주의 본질, 월지의 사회적 가면, 천간 투출과 합·충이 만드는 내면-외면의 차이를 보여준다.',
    anchors: ['일주', '일지 십이운성', '월지', '천간 투출', '원국 내 합/충', '음양 비율'],
  },
  {
    key: 'career',
    title: '직업과 적성',
    prompt:
      '격국 + 식상/재성/관성 흐름 + 용신을 기준으로 잘 맞는 일 구조, 환경, 피하면 좋은 업무 방식을 적는다.',
    anchors: ['격국', '식신/상관(표현·생산)', '재성(돈 다루는 방식)', '관성(규범·책임)', '용신과 직업'],
  },
  {
    key: 'wealth',
    title: '재물운',
    prompt:
      '재성의 위치/강약, 식상→재성 흐름(食傷生財), 일간 강약을 종합해 돈을 모으고 새는 패턴을 짚는다.',
    anchors: ['편재/정재', '식상생재', '일간 강약', '재성과 대운의 만남'],
  },
  {
    key: 'love',
    title: '연애와 결혼',
    prompt:
      '일주·일지(배우자궁), 배우자성(남=재성/여=관성), 합·충, 도화·천을귀인을 종합해 끌림과 안정의 패턴을 본다.',
    anchors: ['일지 배우자궁 + 십이운성', '배우자성 육친(남=정재 아내/여=정관 남편)', '도화/천을귀인', '일간 강약 + 배우자성 비율'],
  },
  {
    key: 'family',
    title: '가족 관계',
    prompt:
      '연주(부모궁)·인성·정관·비겁의 흐름으로 부모/형제/자녀와의 거리감, 가족 안 역할을 설명한다.',
    anchors: ['연주(부모궁 육친)', '월주(부모·형제궁)', '인성=어머니', '편재=아버지', '비겁=형제', '시주(자녀궁)'],
  },
  {
    key: 'friends',
    title: '대인관계',
    prompt:
      '비겁·식상의 분포와 신살(역마·도화·화개·공망)이 친구·동료 관계에서 만드는 패턴을 본다.',
    anchors: ['비겁(친구·동료)', '식상(표현·말)', '역마/도화/화개/공망', '천을귀인'],
  },
  {
    key: 'direction',
    title: '좋은 방향',
    prompt:
      '용신 오행에 대응하는 색·방향·시간·환경·루틴을 구체적으로 적어 생활에서 기운을 보완한다.',
    anchors: ['용신 오행', '부족한 오행', '오행별 색·방향·시간', '진행 중 대운에 맞춘 환경'],
  },
];

const SYSTEM = `너는 "꼬북점"의 대표 명리 상담가다. 30년차 자평명리·격국용신론 학파의 상담가로, 사용자의 사주를 깊이 읽어 유료 상담 수준의 개인 리포트를 작성한다.

${PREMIUM_SAJU_GUIDE}

[근거 의무 — 매우 중요]
- 입력 컨텍스트의 "## 일주 60갑자 명조", "## 일간 강약", "## 격국", "## 용신 후보", "## 통근/투출", "## 원국 내 합·충·형·파·회", "## 진행 중 흐름", "## 음양 비율", "5대 십성 그룹 카운트" 섹션을 반드시 활용한다.
- 단락마다 최소 하나의 사주 글자/십성/오행/분석 결과를 직접 인용한다. (예: "월지 해(亥水) 위에 일간 정화가 통근하지 못해서…")
- 카테고리 brief의 anchor 목록에 있는 요소들을 우선적으로 인용한다. anchor에서 멀어지면 일반론이 된다.
- 컨텍스트에 없는 합·충·신살을 새로 만들어 인용하지 않는다. (예: 사주에 자(子)가 없는데 자오충이라고 쓰면 안 됨.)

[출력 구조 — 고정]
- 한국어로만, JSON과 코드블록은 쓰지 않는다.
- 첫 줄은 반드시 "한 줄 결론:"으로 시작. 2-3문장으로 핵심을 잡는다. 이 문장에는 일주(예: "정사 일주"), 격국 또는 일간 강약, 그리고 가장 두드러진 십성 그룹 중 두 가지 이상을 반드시 포함한다.
- 그 다음 정확히 4개 섹션을 이 순서로 작성한다.
  1) "## 판독 근거 표" — 4행 이상의 마크다운 표. 열은 정확히 "사주 근거 | 작용 방식 | 현실 체감" 세 개. 각 셀 25–40자. "사주 근거" 셀은 반드시 컨텍스트의 글자/숫자/지표를 직접 인용해야 한다 (예: "월지 해수 가중 1.3", "재성 4개", "갑진 일주 백호").
  2) "## 체감 체크포인트" — 사용자가 스스로 맞춰볼 수 있는 4-6개 bullet. 각 줄은 "이럴 때 자주 ~함" 형식. 사용자가 "어? 진짜 나 그래"라고 무릎을 칠 수 있게 구체적인 장면을 그린다. 추상어("스트레스 받음") 금지 → 구체 장면("회의에서 결론 안 나면 자리 못 떠나는 편")으로 적는다.
  3) "## 깊은 풀이" — 3-4개 단락. 각 단락은 (근거 → 작용 방식 → 현실 장면 → 처방)이 한 흐름으로 이어진다. 단락당 4-6문장. 첫 단락은 반드시 "일주 60갑자 명조"를 사용자 데이터로 좁혀 시작한다.
  4) "## 활용 처방" — 4행 이상의 마크다운 표. 열은 정확히 "상황 | 조심할 점 | 써먹는 법" 세 개. 각 셀 25–40자. "써먹는 법"은 추상적 조언이 아니라 오늘부터 실행 가능한 행동(예: "월요일 오전에 미팅 잡지 않기", "지출 카드 분리하기")으로 적는다.

[자체 점검 체크리스트 — 답변 직전에 머릿속으로 통과시킬 것]
□ 일주(60갑자) 이름을 본문에 정확히 한 번 이상 인용했는가?
□ 5대 십성 그룹 카운트의 1위 그룹을 인용했는가?
□ 오행 가중 점수의 가장 강한/약한 자리를 숫자로 인용했는가?
□ 진행 중 대운/세운의 시기(연도 또는 나이)를 한 번 이상 인용했는가?
□ 일반론 금지 목록의 표현이 본문에 들어가지 않았는가?
□ "이럴 때 자주 ~함" 체크포인트가 추상이 아니라 장면을 그리는가?

[표현 규칙]
- 명리 술어는 처음 등장할 때 한글 뜻 병기. 예: 식신(食神, 표현과 생산성).
- "정확하다"고 주장하지 말고, 계산된 근거와 현실 장면을 촘촘히 연결해 사용자가 체감하도록 만든다.
- 전체 분량은 2,200-3,200자 안팎. 토큰이 모자라더라도 4개 섹션 구조는 절대 깨지 않는다.`;

export async function generateInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
  focus?: string,
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new Error(`Unknown interpretation category: ${category}`);
  const context = formatSajuContext(saju, name);
  const anchorLines = cat.anchors.map((a) => `- ${a}`).join('\n');
  const userMsg = `다음 사주를 "${cat.title}" 관점에서 깊이 풀이해줘.

${context}

중점: ${cat.prompt}

이 카테고리에서 반드시 인용해야 하는 명리 근거(앵커):
${anchorLines}

${focus ? `\n추가 심화 초점: ${focus}\n이 초점을 중심으로 일반론보다 더 구체적인 판독 근거, 위험 신호, 실전 처방을 강화해줘.\n` : ''}
작성 요구:
- 단락마다 위 앵커 중 최소 하나를 실제로 인용한다.
- 판독 근거 표에는 위 앵커를 4행 이상 반영한다.
- "왜 이 풀이가 나오는지"가 매 단락에서 느껴져야 한다.
- 사용자가 체감으로 검증할 수 있는 행동/감정 장면을 최소 3개 포함한다.
- 컨텍스트에 없는 글자/합·충·신살은 만들어내지 않는다.`;
  return complete({
    tier: 'saju',
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 4096,
    temperature: 0.5,
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
  focus?: string,
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

  const focusLine = focus ? ` 이번 심화 초점은 “${focus}”입니다.` : '';
  const content = `한 줄 결론: ${displayName}님의 ${cat.title}은 ${strong} 기운이 강하게 체감되고, ${weak} 기운을 의식적으로 보완할 때 균형이 좋아지는 구조입니다. ${cat.focus}을 볼 때 핵심은 일주 ${palja.day.ganHanja}${palja.day.jiHanja}(${palja.day.gan}${palja.day.ji})와 오행 분포의 온도 차이를 함께 읽는 것입니다.${focusLine}

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
