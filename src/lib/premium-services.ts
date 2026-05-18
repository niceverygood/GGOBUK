export const PREMIUM_SERVICE_IDS = [
  'monthly-flow',
  'yearly-report',
  'love-timing',
  'wealth-timing',
  'career-switch',
  'decision-oracle',
] as const;

export type PremiumServiceId = (typeof PREMIUM_SERVICE_IDS)[number];

export interface PremiumService {
  id: PremiumServiceId;
  title: string;
  subtitle: string;
  cost: number;
  badge: string;
  emoji: string;
  requiresTopic?: boolean;
  placeholder?: string;
  focus: string;
  deliverable: string;
}

export const PREMIUM_SERVICES: PremiumService[] = [
  {
    id: 'monthly-flow',
    title: '이번달 운세 플랜',
    subtitle: '이번 달의 기회, 조심할 날, 행동 루틴',
    cost: 6,
    badge: '월간',
    emoji: '🗓',
    focus:
      '이번 달의 오행 흐름, 일과 관계에서 기회가 커지는 구간, 조심할 컨디션과 감정 패턴',
    deliverable:
      '주간별 흐름표, 이번 달 핵심 행동 5개, 피해야 할 선택, 행운 루틴',
  },
  {
    id: 'yearly-report',
    title: '2026 연간 운세 리포트',
    subtitle: '올해의 일, 돈, 관계, 건강 루틴 큰 그림',
    cost: 9,
    badge: '깊게',
    emoji: '✨',
    focus:
      '2026년 세운과 사용자 원국의 만남, 일/돈/관계/생활 리듬에서 커지는 주제',
    deliverable:
      '분기별 흐름, 올해 잡아야 할 기회, 주의할 결정, 연말까지의 전략',
  },
  {
    id: 'love-timing',
    title: '연애·결혼 타이밍',
    subtitle: '관계가 깊어지는 시기와 흔들리는 패턴',
    cost: 7,
    badge: '인기',
    emoji: '💗',
    focus:
      '연애와 결혼에서 잘 맞는 상대 유형, 관계가 깊어지는 타이밍, 반복 갈등의 원인',
    deliverable: '좋은 상대 체크리스트, 관계 진전 타이밍, 고백/대화/결정 조언',
  },
  {
    id: 'wealth-timing',
    title: '재물 타이밍 지도',
    subtitle: '돈이 모이는 방식과 새는 지점',
    cost: 7,
    badge: '실전',
    emoji: '💰',
    focus:
      '재물운의 구조, 돈이 모이는 습관, 감정 소비와 무리한 확장을 피하는 기준',
    deliverable: '수입 구조 제안, 지출 경고 신호, 모으는 시기와 지키는 시기',
  },
  {
    id: 'career-switch',
    title: '이직·창업 판단서',
    subtitle: '움직일 때와 버틸 때를 구분',
    cost: 6,
    badge: '커리어',
    emoji: '💼',
    focus:
      '직업 적성, 조직/독립/창업 성향, 이직과 전환을 판단할 때의 사주 근거',
    deliverable: '맞는 업무 구조, 위험한 전환 신호, 30일 실행 플랜',
  },
  {
    id: 'decision-oracle',
    title: '중요한 결정 체크',
    subtitle: '고민 하나를 사주 흐름에 맞춰 점검',
    cost: 4,
    badge: '빠른답',
    emoji: '🧭',
    requiresTopic: true,
    placeholder: '예: 지금 이직해도 될까? / 이 사람과 계속 만나도 될까?',
    focus:
      '사용자가 입력한 고민을 원국, 오행 균형, 십성, 현재 흐름 관점에서 점검',
    deliverable:
      '결정 전 체크포인트, 지금 유리한 선택, 보류해야 할 신호, 3일 안에 할 행동',
  },
];

export function premiumServiceById(id: string): PremiumService | undefined {
  return PREMIUM_SERVICES.find((service) => service.id === id);
}
