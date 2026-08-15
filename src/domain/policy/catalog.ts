/**
 * 서비스 카탈로그 — 가격·재화·무료범위의 **단일 진실**.
 *
 * `src/domain` 규약: Next / DB / LLM 을 import 하지 않는다.
 *
 * 왜 여기인가
 *  마스터 명세 §2.4 는 "가격·무료권·재화 교환·환불·동의 문안은 effective_at 과
 *  policy_version 을 가진 서버 소유 PolicyConfig 에서 파생한다. UI·API 검증·약관 표·
 *  테스트가 서로 다른 하드코딩을 갖지 않게 한다" 를 요구한다.
 *  이 파일이 그 PolicyConfig 의 코드 측 구현이며, `POLICY_VERSION` 으로 버전을 박는다.
 *
 * ⚠️ 과거 구매에는 **당시 policy snapshot** 을 보존하고 새 정책을 소급하지 않는다.
 *    구매 시점에 `POLICY_VERSION` 과 실제 청구액을 리포트/원장에 함께 기록한다.
 */

export type Asset = 'EGG' | 'LEAF' | 'CHAT_TURN';

/** 재화 표시명 (UI 공통) */
export const ASSET_LABEL: Record<Asset, string> = {
  EGG: '꼬북알',
  LEAF: '꼬북잎',
  CHAT_TURN: '채팅 회차',
};

/**
 * 정책 버전. 가격·무료범위·교환비를 바꿀 때마다 올린다.
 * 원장·리포트에 함께 저장되어 "이 결제는 어느 정책으로 계산됐는가"를 재현한다.
 */
export const POLICY_VERSION = '2026-08-14.1';

/** 재화 교환비 — 1 꼬북알 = 3 꼬북잎 (양방향). */
export const EXCHANGE = {
  eggToLeaf: 3,
  leafToEgg: 3,
} as const;

/** 꼬북잎 1개로 충전되는 채팅 회차 수. */
export const LEAF_TO_CHAT_TURNS = 3;

/** 리포트 종류. DB `reports.type` 과 1:1. */
export type ReportType =
  | 'full_saju'
  | 'compatibility'
  | 'daewoon'
  | 'yearly'
  | 'lucky_day'
  | 'monthly'
  | 'jamidusu';

export interface ServiceSpec {
  type: ReportType;
  /** 사용자 노출명 */
  label: string;
  /** 한 줄 설명 (홈 그리드·상점 공통) */
  blurb: string;
  /** 과금 재화 */
  asset: Asset;
  /** 가격 (해당 재화 단위) */
  price: number;
  /** 무료로 볼 수 있는 범위 — 결제 전 미리보기에 노출 */
  freeScope: string;
  /** 프로필 2명이 필요한가 (궁합) */
  requiresSecondProfile: boolean;
  /** feature flag 로 가려져 있는가 */
  flag?: FeatureFlag;
}

/**
 * 가격표. 마스터 명세 §5.2 표를 그대로 반영한다.
 *
 * ⚠️ `PRICING.md` v2.1 과 값이 다른 항목이 있다(택일 3→4알). §2.4 우선순위상
 *    "이 프롬프트에서 확정한 새 제품 결정"(4순위)이 `PRICING.md`(7순위)를 이긴다.
 *    문서 동기화는 Phase 8 에서 수행한다.
 */
export const SERVICE_CATALOG: Record<ReportType, ServiceSpec> = {
  full_saju: {
    type: 'full_saju',
    label: '전체 사주 해설',
    blurb: '사주 여덟 글자로 읽는 나라는 사람',
    asset: 'EGG',
    price: 5,
    freeScope: '만세력·일주·오행 분포·한 줄 요약',
    requiresSecondProfile: false,
  },
  compatibility: {
    type: 'compatibility',
    label: '궁합 해설',
    blurb: '두 사람의 결이 어떻게 만나는지',
    asset: 'EGG',
    price: 6,
    freeScope: '두 사람 선택과 관계 핵심 키워드',
    requiresSecondProfile: true,
    flag: 'FEATURE_COMPATIBILITY',
  },
  daewoon: {
    type: 'daewoon',
    label: '대운 상세',
    blurb: '10년 단위로 흐르는 인생의 큰 결',
    asset: 'EGG',
    price: 3,
    freeScope: '대운 시작 나이와 10년 구간 타임라인',
    requiresSecondProfile: false,
    flag: 'FEATURE_DAEWOON',
  },
  yearly: {
    type: 'yearly',
    label: '연도별 운세',
    blurb: '고른 해의 분기·월별 흐름',
    asset: 'EGG',
    price: 3,
    freeScope: '연간 점수·키워드·핵심 흐름',
    requiresSecondProfile: false,
    flag: 'FEATURE_YEARLY',
  },
  lucky_day: {
    type: 'lucky_day',
    label: '택일',
    blurb: '중요한 날, 후보 중 어느 날이 좋은지',
    asset: 'EGG',
    price: 4,
    freeScope: '후보별 점수·등급과 Top 추천',
    requiresSecondProfile: false,
    flag: 'FEATURE_LUCKY_DAY',
  },
  monthly: {
    type: 'monthly',
    label: '이번 달 상세 풀이',
    blurb: '분야별 흐름과 시기까지',
    asset: 'EGG',
    price: 4,
    freeScope: '이번 달 3줄 요약',
    requiresSecondProfile: false,
  },
  jamidusu: {
    type: 'jamidusu',
    label: '자미두수',
    blurb: '12궁과 사화로 읽는 또 다른 지도',
    asset: 'EGG',
    price: 10,
    freeScope: '총점과 한 줄 요약',
    requiresSecondProfile: false,
    flag: 'FEATURE_JAMIDO',
  },
};

/** 리포트가 아닌 소비 — 오늘의 운세 추가 생성, 채팅 추가 질문. */
export const CONSUMABLE = {
  /** 오늘의 운세: 하루 1회 무료, 이후 1 꼬북잎 */
  dailyFortuneExtra: { asset: 'LEAF' as Asset, price: 1 },
  /** 채팅: 하루 무료 질문권 1장, 이후 유료 회차 1개 */
  chatTurn: { asset: 'CHAT_TURN' as Asset, price: 1 },
} as const;

/** 무료권 정책 — KST 기준 window. */
export const ENTITLEMENT = {
  /** 채팅 무료 질문권: 매일 KST 23:00 에 새 window 시작, 1장, 누적 없음 */
  chatQuestion: { grantPerWindow: 1, windowStartHourKst: 23 },
  /** 오늘의 운세 무료권: 매일 KST 00:00 갱신, 1회 */
  dailyFortune: { grantPerWindow: 1, windowStartHourKst: 0 },
} as const;

// ─── feature flags ──────────────────────────────────────────────────────────

export type FeatureFlag =
  | 'FEATURE_COMPATIBILITY'
  | 'FEATURE_DAEWOON'
  | 'FEATURE_YEARLY'
  | 'FEATURE_LUCKY_DAY'
  | 'FEATURE_JAMIDO'
  | 'FEATURE_WALLET_V2_READ';

/**
 * 플래그 기본값. **서버 소유** — 클라이언트 공개 환경변수 하나에 비용·권한 판단을
 * 의존하지 않는다(§4.2). 값 해석은 `src/lib/flags.ts`(서버 전용)가 담당한다.
 */
export const FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  FEATURE_COMPATIBILITY: false,
  FEATURE_DAEWOON: false,
  FEATURE_YEARLY: false,
  FEATURE_LUCKY_DAY: false,
  FEATURE_JAMIDO: false,
  // wallet v2 는 backfill·reconcile 검증 전까지 읽기 전환 금지 (§10.1)
  FEATURE_WALLET_V2_READ: false,
};

/** 카탈로그 조회 헬퍼 — 알 수 없는 type 은 null (호출자가 404 로 번역). */
export function serviceSpec(type: string): ServiceSpec | null {
  return SERVICE_CATALOG[type as ReportType] ?? null;
}

/** 가격 스냅샷 — 리포트·원장에 저장해 소급 적용을 막는다. */
export interface PriceSnapshot {
  asset: Asset;
  amount: number;
  policyVersion: string;
}

export function priceSnapshotOf(spec: ServiceSpec): PriceSnapshot {
  return {
    asset: spec.asset,
    amount: spec.price,
    policyVersion: POLICY_VERSION,
  };
}
