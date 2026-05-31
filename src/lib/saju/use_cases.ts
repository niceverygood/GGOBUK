// Use-case 기반 사주 풀이 진입점 정의.
//
// 12 카테고리는 너무 광범위해서 사용자가 "내 질문에 답"을 받기 어렵다.
// 실제 사용자가 가장 자주 가져오는 6개 질문을 미리 정의하고, 각각에
// 매핑되는 사주 카테고리·이벤트 마커·LLM 포커스를 묶어둔다.

import type { EventMarkerType } from './daewoon_fortune';
import type { InterpretationCategory } from '@/types/db';

export type UseCaseKey =
  | 'love'
  | 'career'
  | 'wealth'
  | 'health'
  | 'marriage'
  | 'study';

export interface UseCase {
  key: UseCaseKey;
  title: string;
  /** 한 줄 부제 — 사용자가 가진 실제 질문에 가까운 톤 */
  question: string;
  emoji: string;
  /** 메인 사주 카테고리 — 첫 번째가 primary */
  categories: InterpretationCategory[];
  /** 관련 인생 이벤트 마커 타입 */
  eventTypes: EventMarkerType[];
  /** AI 풀이 생성 시 focus 인자로 들어갈 LLM 지시 */
  focus: string;
  /** 카드 배경 (Tailwind) — 점신식 플랫 화이트로 통일 */
  cardClass: string;
  /** 본문 강조 색 (chip·border 등) */
  accentChipClass: string;
}

export const USE_CASES: Record<UseCaseKey, UseCase> = {
  love: {
    key: 'love',
    title: '연애운',
    question: '지금 만나는 사람이 맞는지, 끌리는 결은 어떤지',
    emoji: '💞',
    categories: ['love', 'ilju'],
    eventTypes: ['marriage'],
    focus:
      '지금의 연애 상태, 끌리는 사람의 결, 관계가 잘 풀리는 흐름과 거리 둘 시점을 중심으로 풀어줘. 일주(배우자궁) + 배우자성 십성을 가장 깊게 인용.',
    cardClass: 'bg-white border-navy/10',
    accentChipClass: 'bg-red/15 text-red',
  },
  career: {
    key: 'career',
    title: '이직 타이밍',
    question: '지금 옮겨도 될지, 더 기다려야 할지',
    emoji: '💼',
    categories: ['career'],
    eventTypes: ['career', 'turning'],
    focus:
      '이직·전환의 적기와 위험기. 진행 중/다음 대운의 관성(官星) 흐름, 격국과의 어울림, 올해 세운의 변화 신호 중심으로.',
    cardClass: 'bg-white border-navy/10',
    accentChipClass: 'bg-navy/10 text-navy',
  },
  wealth: {
    key: 'wealth',
    title: '돈 흐름',
    question: '올해 큰 지출·투자 해도 되는지',
    emoji: '💰',
    categories: ['wealth'],
    eventTypes: ['wealth'],
    focus:
      '돈을 모으고 새는 패턴. 재성(財星) 활성 여부, 식상→재성 흐름, 군겁쟁재 위험. 큰 지출·투자에 좋은 해와 피해야 할 해를 시점 포함해 짚어줘.',
    cardClass: 'bg-white border-navy/10',
    accentChipClass: 'bg-gold/25 text-[#7C5A0E]',
  },
  health: {
    key: 'health',
    title: '컨디션',
    question: '요즘 왜 이렇게 피곤한지, 회복은 어떻게',
    emoji: '🩺',
    categories: ['ohaeng', 'weakness'],
    eventTypes: ['health'],
    focus:
      '오행 균형, 부족 오행이 가져오는 몸·마음 신호, 진행 중 대운에서 무리되는 영역. 회복을 위한 색·환경·습관 처방을 구체적으로.',
    cardClass: 'bg-white border-navy/10',
    accentChipClass: 'bg-mint/22 text-[#16706B]',
  },
  marriage: {
    key: 'marriage',
    title: '결혼 시기',
    question: '언제쯤이 좋을까, 어떤 결의 사람과',
    emoji: '💍',
    // 결혼은 (1) 연애·일지·배우자성과 (2) 가족 영역(부모·시댁·자녀)이 함께
    // 작용해서, love + family 매핑이 가장 결혼이라는 사건을 입체적으로 보여준다.
    categories: ['love', 'family'],
    eventTypes: ['marriage'],
    focus:
      '결혼 가능 시기 — 일지 합 진입 + 배우자성(남=재성/여=관성) 활성 시점. 어떤 결의 사람과 잘 맞는지(용신 보완 결). 결혼 후 가족(부모·시댁·자녀) 영역에서의 흐름도 함께.',
    cardClass: 'bg-white border-navy/10',
    accentChipClass: 'bg-gold/25 text-[#7C5A0E]',
  },
  study: {
    key: 'study',
    title: '공부·자격',
    question: '지금 시작해도 될지, 어느 분야가 잘 풀릴지',
    emoji: '📚',
    // 공부·자격은 (1) 어떤 분야가 잘 맞는지(career의 격국·용신 적성) +
    // (2) 학습 환경·시간대·색·루틴(direction의 용신 처방). strength는 너무
    // 적성과 겹쳐서 빠짐.
    categories: ['career', 'direction'],
    eventTypes: ['study'],
    focus:
      '인성(印星)이 강해지는 시기 — 공부·자격증·귀인의 흐름. 어느 분야가 사주적으로 잘 맞는지(격국·용신 기반). 학습 환경·시간대·집중에 좋은 색·방향 처방까지.',
    cardClass: 'bg-white border-navy/10',
    accentChipClass: 'bg-mint/22 text-[#16706B]',
  },
};

export const USE_CASE_ORDER: UseCaseKey[] = [
  'love',
  'career',
  'wealth',
  'health',
  'marriage',
  'study',
];

export function isUseCaseKey(value: string): value is UseCaseKey {
  return value in USE_CASES;
}
