// 꼬북점 가격정책 v2 (2026-08-10 단순화) — single source of truth.
// 과금 대상은 딱 두 개: 전체 풀이(reading) · 채팅(chat). 나머지 기능/패키지
// 상수는 과거 결제 row 해석용으로만 유지한다.

/** Active credit package ids matching the actual CREDIT_PACKAGES array. */
export type CreditPackageId = 'mini' | 'entry' | 'focus' | 'deep' | 'master';

/** First-purchase welcome deal id — v2에서 판매 중단, 과거 row 해석용. */
export type FirstDealId = 'firstdeal';

/** Legacy / retired ids kept only for already-persisted credit_purchases rows. */
export type LegacyCreditPackageId = 'plus' | 'starter';

export type AnyCreditPackageId = CreditPackageId | FirstDealId | LegacyCreditPackageId;

export interface CreditPackage {
  id: CreditPackageId;
  label: string;
  credits: number;
  bonusCredits: number;
  priceKrw: number;
  caption: string;
  badge?: string;
  perks: string[];
  recommended?: boolean;
  bestValue?: boolean;
  /** v2에서 미판매 — 과거 구매 row 해석용으로만 남은 플래그. */
  firstDealOnly?: boolean;
}

/** Display unit shown to users. */
export const CREDIT_UNIT = '꼬북알';

/** New-user signup bonus (granted exactly once via grant_signup_bonus RPC). */
export const SIGNUP_BONUS_CREDITS = 30;

/** Refund window in days (purchased credits only, must be fully unused). */
export const REFUND_WINDOW_DAYS = 7;

/**
 * Per-feature credit cost.
 *
 * v2.1 (2026-08-11) 확장 — 무료 콘텐츠로 매일 방문 → 출석으로 꼬북알 적립 →
 * 월별·주제별 유료 풀이 → 꼬북이 후속 상담 이라는 흐름에 맞춰 상품을 나눴다.
 * 월별 상세(4알)는 한 달 출석 보상 상한(4알)과 같게 잡아, 꾸준히 방문한
 * 사용자는 매달 한 편을 무료로 볼 수 있게 한다.
 */
export const CREDIT_COSTS = {
  /** 채팅 추가 질문 (하루 무료 한도 초과분) */
  chat: 1,
  /** 내 사주 전체 풀이 한 편 (재생성도 동일가) */
  reading: 5,
  /** 월별 상세 사주풀이 (그 달 1회 구매, 보관함에 영구 보관) */
  monthly: 4,
  /** 주제별 풀이 — 이직/직업·면접·연애·재회 */
  topic: 5,
  /** 꿈해몽 상세 풀이 */
  dream: 2,
  /** 중요한 날 비교 (후보 날짜 2~3개) */
  luckyDay: 3,
} as const;

/** Per-day free quota before credits get spent. Resets at KST midnight. */
export const FREE_DAILY_LIMITS = {
  /** free chat messages per day */
  chat: 5,
  /** daily fortune messages/day (always 1, free) */
  dailyFortune: 1,
  /** 거북빵 오픈 (하루 1회, 무료) */
  bread: 1,
} as const;

/**
 * 행운의 거북빵 — 매일 무료 오픈 + 출석 보상 규칙.
 * 값을 바꾸면 `open_bread()` RPC 호출 인자도 함께 바뀐다 (기본값은 마이그레이션 18).
 */
export const BREAD = {
  /** 도장 N개마다 보상 지급 */
  stampsPerReward: 7,
  /** 사이클 완성 시 지급 꼬북알 */
  creditsPerReward: 1,
  /** 한 달에 거북빵으로 받을 수 있는 꼬북알 상한 (황금 거북빵 포함) */
  monthlyRewardCap: 4,
  /** 황금 거북빵 등장 확률 */
  goldenChance: 0.07,
  /** 황금 거북빵 보너스 꼬북알 */
  goldenBonus: 1,
} as const;

// ⚠️ 패키지 id·알 수·가격은 네이티브 IAP 상품(심사 제출본)과 1:1 매핑 —
// 변경 금지. 카피(caption/perks)만 v2 기능에 맞게 손질됨.
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'mini',
    label: '한 알 줍기',
    credits: 2,
    bonusCredits: 0,
    priceKrw: 900,
    caption: '채팅 몇 마디만 더 하고 싶을 때',
    badge: '최소 충전',
    perks: ['채팅 추가 2회', '필요한 만큼만 충전'],
  },
  {
    id: 'entry',
    label: '입문 주머니',
    credits: 8,
    bonusCredits: 0,
    priceKrw: 2900,
    caption: '가볍게 시작하고 싶을 때',
    badge: '첫 충전',
    perks: ['전체 풀이 1편 + 채팅 3회'],
  },
  {
    id: 'focus',
    label: '정밀풀이 알주머니',
    credits: 36,
    bonusCredits: 6,
    priceKrw: 12900,
    caption: '풀이도 채팅도 넉넉하게',
    badge: '인기',
    perks: ['전체 풀이 8편 분량', '또는 채팅 42회'],
    recommended: true,
  },
  {
    id: 'deep',
    label: '꼬북도사 금고',
    credits: 90,
    bonusCredits: 30,
    priceKrw: 29900,
    caption: '깊게 자주 보는 유저용',
    badge: '효율',
    perks: ['전체 풀이 24편 분량', '보너스 30알 포함'],
    bestValue: true,
  },
  {
    id: 'master',
    label: '운세 마스터 상자',
    credits: 180,
    bonusCredits: 80,
    priceKrw: 59000,
    caption: '오래오래 쓰는 최대 구성',
    badge: '최대 보너스',
    perks: ['보너스 80알 포함', '전체 풀이 52편 분량'],
  },
];

/** 패키지(또는 임의의 알 개수)로 살 수 있는 각 기능별 회수 계산. */
export function packageBreakdown(creditsTotal: number): {
  readings: number;
  chats: number;
} {
  return {
    readings: Math.floor(creditsTotal / CREDIT_COSTS.reading),
    chats: Math.floor(creditsTotal / CREDIT_COSTS.chat),
  };
}

/**
 * Retired packs — no longer purchasable, kept ONLY so historical
 * credit_purchases rows still resolve to their original price/credits.
 */
interface RetiredPackage extends Omit<CreditPackage, 'id'> {
  id: LegacyCreditPackageId | FirstDealId;
}
const RETIRED_PACKAGES: RetiredPackage[] = [
  {
    id: 'starter',
    label: '입문알 한 줌 (단종)',
    credits: 12,
    bonusCredits: 0,
    priceKrw: 4900,
    caption: '단종된 패키지',
    perks: [],
  },
  {
    id: 'firstdeal',
    label: '웰컴 깜짝 특가 (단종)',
    credits: 12,
    bonusCredits: 8,
    priceKrw: 1900,
    caption: '단종된 첫 충전 특가',
    perks: [],
    firstDealOnly: true,
  },
];

export function creditPackageById(id: string): CreditPackage | undefined {
  // Legacy: rows persisted under 'plus' should resolve to the 'focus' pack.
  if (id === 'plus') return CREDIT_PACKAGES.find((pkg) => pkg.id === 'focus');
  const live = CREDIT_PACKAGES.find((pkg) => pkg.id === id);
  if (live) return live;
  // Retired packs: resolve historical rows only (never purchasable now).
  return RETIRED_PACKAGES.find((pkg) => pkg.id === id) as
    | CreditPackage
    | undefined;
}

export function totalCredits(pkg: CreditPackage): number {
  return pkg.credits + pkg.bonusCredits;
}

/** Price per credit in KRW (for showing "1알당 X원" hints). */
export function pricePerCredit(pkg: CreditPackage): number {
  return Math.round(pkg.priceKrw / totalCredits(pkg));
}

export function formatKrw(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}
