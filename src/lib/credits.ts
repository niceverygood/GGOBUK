// 꼬북점 가격정책 v1 — single source of truth shared by UI, API, and DB.
// See PRICING.md at repo root for the human-readable policy.

/** Active credit package ids matching the actual CREDIT_PACKAGES array. */
export type CreditPackageId = 'starter' | 'focus' | 'deep' | 'master';

/** First-purchase welcome deal id (24h limited, once per account). */
export type FirstDealId = 'firstdeal';

/** Legacy alias kept for already-persisted rows in credit_purchases. */
export type LegacyCreditPackageId = 'plus';

export type AnyCreditPackageId = CreditPackageId | FirstDealId | LegacyCreditPackageId;

export interface CreditPackage {
  id: CreditPackageId | FirstDealId;
  label: string;
  credits: number;
  bonusCredits: number;
  priceKrw: number;
  caption: string;
  badge?: string;
  perks: string[];
  recommended?: boolean;
  bestValue?: boolean;
  /** Only purchasable within FIRST_DEAL_WINDOW_HOURS of signup, once per account. */
  firstDealOnly?: boolean;
}

/** Hours after signup the first-purchase deal stays available. */
export const FIRST_DEAL_WINDOW_HOURS = 24;

/**
 * 첫 충전 깜짝 특가 — 가입 24시간 이내 1회만. 1알당 95원으로 전 상품 중 최저가.
 * Kept OUT of CREDIT_PACKAGES so it never shows in the normal grid; surfaced
 * only via the FirstDealBanner when the user is eligible.
 */
export const FIRST_DEAL_PACKAGE: CreditPackage = {
  id: 'firstdeal',
  label: '웰컴 깜짝 특가',
  credits: 12,
  bonusCredits: 8,
  priceKrw: 1900,
  caption: '가입 24시간 한정 · 1알당 95원',
  badge: '첫 충전 한정',
  perks: ['지금 가입 보너스에 더해', '정밀 풀이 10개 분량', '역대 최저가 1알 95원'],
  firstDealOnly: true,
};

/** Display unit shown to users. */
export const CREDIT_UNIT = '꼬북알';

/** New-user signup bonus (granted exactly once via grant_signup_bonus RPC). */
export const SIGNUP_BONUS_CREDITS = 30;

/** 친구 초대 보상 — 초대한 친구가 사주를 제출(수락)하면 host에게 지급.
 *  초대 토큰당 1회 (relation_invites.status='completed' 가 중복 방지). */
export const INVITE_REWARD_CREDITS = 10;

/** Refund window in days (purchased credits only, must be fully unused). */
export const REFUND_WINDOW_DAYS = 7;

/**
 * Per-feature credit cost. 0 = free with no daily cap (but still subject to
 * FREE_DAILY_LIMITS where applicable). Keep in sync with PRICING.md §2.
 */
// 2026-05-27 v1.1 인상 — 시장가 대비 1/5~1/15 수준으로 낮았던 단가를 한 단계
// 올림. 정밀풀이 패키지(₩307/알) 기준 풀이 한 번이 ₩921로 정렬되어 사주
// 업계 ₩2,000~5,000 단건가 대비 여전히 경쟁력 있는 가격 유지.
// 채팅(1알=₩307)은 인게이지먼트 위해 유지.
export const CREDIT_COSTS = {
  chat: 1,
  interpretation: 3,
  compatibility: 6,
  daewoon: 3,
  auspicious: 4,
  talisman: 7,
  comic: 8,
} as const;

/**
 * Per-day free quota before credits get spent. Resets at KST midnight.
 * Keep in sync with PRICING.md §3.
 */
export const FREE_DAILY_LIMITS = {
  /** persona chat assistant replies/day before each one costs CREDIT_COSTS.chat */
  chat: 5,
  /** daily fortune messages/day (always 1) */
  dailyFortune: 1,
  /** first N interpretation categories that stay free forever */
  freeInterpretations: 3,
  /** relations a free user can register (after this, credits required) */
  relations: 3,
  /** free talismans per account lifetime */
  talismansLifetime: 1,
} as const;

// 패키지 perks는 사용자가 카드에서 한눈에 보는 마케팅 카피.
// 정확한 dynamic 환산은 packageBreakdown() 사용.
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    label: '입문알 한 줌',
    credits: 12,
    bonusCredits: 0,
    priceKrw: 4900,
    caption: '가볍게 맛보고 싶을 때',
    badge: '첫 충전',
    perks: ['정밀 풀이 4개', '또는 궁합 2회'],
  },
  {
    id: 'focus',
    label: '정밀풀이 알주머니',
    credits: 36,
    bonusCredits: 6,
    priceKrw: 12900,
    caption: '사주·궁합·채팅을 같이 볼 때',
    badge: '인기',
    perks: ['정밀 풀이 14개', '궁합 7회 또는 부적 6장'],
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
    perks: ['정밀 풀이 40개', '궁합 20회 또는 부적 17장'],
    bestValue: true,
  },
  {
    id: 'master',
    label: '운세 마스터 상자',
    credits: 180,
    bonusCredits: 80,
    priceKrw: 59000,
    caption: '친구·가족까지 함께 볼 때',
    badge: '최대 보너스',
    perks: ['보너스 80알 포함', '정밀 풀이 86개 또는 궁합 43회'],
  },
];

/**
 * 패키지(또는 임의의 알 개수)로 살 수 있는 각 기능별 회수 계산.
 * CREDIT_COSTS이 바뀌면 자동으로 환산값도 따라간다 — 가격 인상 시 perks
 * 텍스트 따로 안 고쳐도 store UI는 동기화됨.
 */
export function packageBreakdown(creditsTotal: number): {
  interpretations: number;
  compats: number;
  auspicious: number;
  talismans: number;
  comics: number;
  daewoons: number;
  chats: number;
} {
  return {
    interpretations: Math.floor(creditsTotal / CREDIT_COSTS.interpretation),
    compats: Math.floor(creditsTotal / CREDIT_COSTS.compatibility),
    auspicious: Math.floor(creditsTotal / CREDIT_COSTS.auspicious),
    talismans: Math.floor(creditsTotal / CREDIT_COSTS.talisman),
    comics: Math.floor(creditsTotal / CREDIT_COSTS.comic),
    daewoons: Math.floor(creditsTotal / CREDIT_COSTS.daewoon),
    chats: Math.floor(creditsTotal / CREDIT_COSTS.chat),
  };
}

export function creditPackageById(id: string): CreditPackage | undefined {
  // First-purchase welcome deal lives outside CREDIT_PACKAGES.
  if (id === 'firstdeal') return FIRST_DEAL_PACKAGE;
  // Legacy: rows persisted under 'plus' should resolve to the 'focus' pack.
  if (id === 'plus') return CREDIT_PACKAGES.find((pkg) => pkg.id === 'focus');
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
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
