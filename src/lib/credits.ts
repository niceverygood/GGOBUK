// 꼬북점 가격정책 v1 — single source of truth shared by UI, API, and DB.
// See PRICING.md at repo root for the human-readable policy.

/** Active credit package ids matching the actual CREDIT_PACKAGES array. */
export type CreditPackageId = 'mini' | 'entry' | 'focus' | 'deep' | 'master';

/** First-purchase welcome deal id (24h limited, once per account). */
export type FirstDealId = 'firstdeal';

/** Legacy / retired ids kept only for already-persisted credit_purchases rows. */
export type LegacyCreditPackageId = 'plus' | 'starter';

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
//
// `interpretation` 은 페르소나 모드별 가격 차등 적용 후의 "기본/평균" 값이며
// 실제 청구는 `INTERPRETATION_COST_BY_PERSONA` 로 분기. (`packageBreakdown` 이
// 환산용으로 사용 → 보수적으로 무당 모드(3알) 기준 그대로 유지.)
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
 * 사주 해설 페르소나별 가격 차등 (2026-05-30 도입).
 *
 * 꼬북이 = 친구 톤, 가장 가볍게 다가가는 무료 진입 → 최저가
 * 무당   = 직설 MZ 톤
 * 보살   = 따뜻한 위로 톤
 * 도사   = 정통 사주 격국·신살 등 가장 깊고 비싼 톤 → 프리미엄
 *
 * UX 의도: 사용자가 깊은 풀이를 원할수록 도사 모드를 선택하게 만들어
 * 객단가 상승 + "도사가 비싼만큼 깊다"는 인식 형성. 무료 진입(꼬북이)
 * 으로 컨버전 + 보살/도사로 ARPU.
 */
export const INTERPRETATION_COST_BY_PERSONA = {
  kkobuk: 2,
  mudang: 3,
  bosal: 4,
  dosa: 5,
} as const;

export function interpretationCostFor(
  persona: keyof typeof INTERPRETATION_COST_BY_PERSONA | string | null | undefined,
): number {
  if (!persona) return CREDIT_COSTS.interpretation;
  return (
    INTERPRETATION_COST_BY_PERSONA[
      persona as keyof typeof INTERPRETATION_COST_BY_PERSONA
    ] ?? CREDIT_COSTS.interpretation
  );
}

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

/**
 * 무료로 열리는 정밀풀이 카테고리 (12개 중 앞 3개 — 총평/오행/일주).
 * 이 카테고리는 spendCredits를 건너뛰고(BETA_FREE_MODE 해제 후에도 항상 0알),
 * UI도 페이월 없이 바로 생성한다. 나머지 9개(유료)는 호기심 갭 페이월
 * (훅 미리보기 무료 → 결제로 본문 해제)을 거친다. PRICING.md §3 "free 3" 정렬.
 */
export const FREE_INTERPRETATION_KEYS = ['overview', 'ohaeng', 'ilju'] as const;

export function isFreeInterpretation(category: string): boolean {
  return (FREE_INTERPRETATION_KEYS as readonly string[]).includes(category);
}

// 패키지 perks는 사용자가 카드에서 한눈에 보는 마케팅 카피.
// 정확한 dynamic 환산은 packageBreakdown() 사용.
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'mini',
    label: '한 알 줍기',
    credits: 2,
    bonusCredits: 0,
    priceKrw: 900,
    caption: '딱 하나만 더 보고 싶을 때',
    badge: '최소 충전',
    perks: ['꼬북이 풀이 1개', '또는 채팅 2회'],
  },
  {
    id: 'entry',
    label: '입문 주머니',
    credits: 8,
    bonusCredits: 0,
    priceKrw: 2900,
    caption: '가볍게 시작하고 싶을 때',
    badge: '첫 충전',
    perks: ['정밀 풀이 2~4개', '또는 궁합 1회'],
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

/**
 * Retired packs — no longer purchasable, kept ONLY so historical
 * credit_purchases rows still resolve to their original price/credits.
 * 'starter' (₩4,900 / 12알) was retired 2026-05-30 when the ₩900 mini +
 * ₩2,900 entry packs replaced it as the low-end entry points.
 */
interface RetiredPackage extends Omit<CreditPackage, 'id'> {
  id: LegacyCreditPackageId;
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
];

export function creditPackageById(id: string): CreditPackage | undefined {
  // First-purchase welcome deal lives outside CREDIT_PACKAGES.
  if (id === 'firstdeal') return FIRST_DEAL_PACKAGE;
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
