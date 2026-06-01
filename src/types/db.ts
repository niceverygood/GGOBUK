// Hand-written DB row types matching supabase/migrations/ (001–005).
// Regenerate with `supabase gen types typescript --linked > src/types/db.ts` once the project is linked.
// Last synced: 2026-05-20 (migration 005_pricing).

import type {
  Palja,
  OhaengCount,
  SipsungMap,
  SinsalEntry,
  DaewoonPeriod,
} from '@/lib/saju/types';

export type RelationType =
  | 'self'
  | 'family'
  | 'friend'
  | 'lover'
  | 'colleague'
  | 'other';
export type Persona = 'kkobuk' | 'dosa' | 'mudang' | 'bosal';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'failed';
// DB column type: every value the credit_purchases.package_id CHECK allows.
// Live (purchasable) + retired ('starter','plus') + first-deal. The app-facing
// CreditPackageId in src/lib/credits.ts is the narrower live-only union.
export type CreditPackageId =
  | 'mini'
  | 'entry'
  | 'starter'
  | 'focus'
  | 'plus'
  | 'deep'
  | 'master'
  | 'firstdeal';
export type CreditPurchaseStatus = 'pending' | 'paid' | 'cancelled' | 'failed';
export type CreditTransactionKind = 'purchase' | 'spend' | 'refund' | 'bonus';
export type InterpretationCategory =
  | 'overview'
  | 'ohaeng'
  | 'ilju'
  | 'strength'
  | 'weakness'
  | 'personality'
  | 'career'
  | 'wealth'
  | 'love'
  | 'family'
  | 'friends'
  | 'direction';

// 개인화 장기 기억 — 페르소나가 세션을 가로질러 사용자를 기억하는 항목.
export type MemoryKind =
  | 'fact' // 지속되는 사실: "강아지 콩이 키움", "부산 거주"
  | 'situation' // 현재 상황: "이직 준비 중", "시험 앞둠"
  | 'preference' // 취향/성향: "INFP라 함", "직설적인 조언 선호"
  | 'relationship' // 관계: "연인 민지와 권태기 고민"
  | 'goal' // 목표: "올해 독립 출간이 목표"
  | 'emotion'; // 반복되는 정서: "요즘 번아웃 호소"

export interface MemoryItem {
  /** 안정적 식별자 — 항목별 삭제/머지에 사용. */
  id: string;
  /** 한 줄 요약(한국어, 간결). */
  text: string;
  kind: MemoryKind;
  /** 1(약함)~5(핵심 정체성/장기 목표). 캡 초과 시 폐기 우선순위. */
  salience: number;
  /** ISO. */
  createdAt: string;
  /** ISO. 재확인될 때 갱신(최근성/감쇠 기준). */
  lastSeenAt: string;
}

export interface UserMemoryRow {
  user_id: string;
  items: MemoryItem[];
  updated_at: string;
}

export interface UserRow {
  id: string;
  nickname: string | null;
  kakao_id: string | null;
  is_pro: boolean;
  pro_expires_at: string | null;
  credit_balance: number;
  signup_bonus_granted: boolean;
  push_enabled: boolean;
  push_token: string | null;
  push_time: string;
  created_at: string;
  updated_at: string;
}

export interface SajuProfileRow {
  id: string;
  owner_id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  is_leap_month: boolean;
  gender: 'M' | 'F';
  relation_type: RelationType;
  relation_label: string | null;
  palja: Palja | null;
  ohaeng_count: OhaengCount | null;
  sipsung: SipsungMap | null;
  sinsal: SinsalEntry[] | null;
  daewoon: DaewoonPeriod[] | null;
  ilgan: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterpretationRow {
  id: string;
  saju_id: string;
  category: InterpretationCategory;
  content: string;
  model: string | null;
  tokens_used: number | null;
  generated_at: string;
}

export interface InterpretationComicRow {
  id: string;
  user_id: string;
  saju_id: string;
  category: InterpretationCategory;
  persona: Persona;
  content_hash: string;
  image_url: string;
  title: string;
  model: string | null;
  format: string;
  prompt_version: string;
  generated_at: string;
}

export interface ChatSessionRow {
  id: string;
  user_id: string;
  saju_id: string;
  persona: Persona;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitedCard {
  position: string;
  char: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  cited_cards: CitedCard[] | null;
  tokens_used: number | null;
  created_at: string;
}

export type DailyFortuneMood =
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'relaxed'
  | 'thinking'
  | 'worried'
  // Legacy values from older daily fortune rows.
  | 'calm'
  | 'focused'
  | 'cautious';

export interface DailyFortuneRow {
  id: string;
  saju_id: string;
  date: string;
  ilji_gan: string;
  ilji_ji: string;
  one_liner: string;
  lucky_color: string | null;
  lucky_number: number | null;
  lucky_direction: string | null;
  recommend: string[] | null;
  avoid: string[] | null;
  mood: DailyFortuneMood | null;
  created_at: string;
}

export interface CompatibilitySection {
  title: string;
  body: string;
}

export interface CompatibilityResult {
  score: number;
  hap: string[];
  chung: string[];
  highlights: string[];
  cautions: string[];
  summary: string;
  headline?: string;
  metaphor?: string;
  verdict?: string;
  sections?: CompatibilitySection[];
  actionTips?: string[];
}

export interface RelationRow {
  id: string;
  user_id: string;
  saju_a_id: string;
  saju_b_id: string;
  compatibility: CompatibilityResult | null;
  created_at: string;
}

export interface TimelineFeedbackRow {
  id: string;
  user_id: string;
  saju_id: string;
  daewoon_start_year: number;
  coldread_text: string;
  feedback: 'correct' | 'wrong' | 'partial' | null;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  kakao_sid: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number;
  started_at: string | null;
  expires_at: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLogRow {
  id: string;
  user_id: string;
  date: string;
  chat_messages: number;
  interpretations_viewed: number;
}

export interface CreditPurchaseRow {
  id: string;
  user_id: string;
  partner_order_id: string;
  kakao_tid: string;
  package_id: CreditPackageId;
  credits: number;
  bonus_credits: number;
  amount: number;
  status: CreditPurchaseStatus;
  approved_at: string | null;
  payment_method_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  kind: CreditTransactionKind;
  amount: number;
  balance_after: number;
  reason: string;
  reference_id: string | null;
  kakao_tid: string | null;
  package_id: CreditPackageId | null;
  price_krw: number | null;
  created_at: string;
}

// ── 유저 매칭 (migration 14) ──
export interface MatchProfileRow {
  user_id: string;
  saju_id: string;
  opt_in: boolean;
  display_nickname: string;
  age_band: string | null;
  gender: 'M' | 'F';
  gender_pref: 'M' | 'F' | 'any';
  bio: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchLikeRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  action: 'like' | 'pass';
  created_at: string;
}

export interface MatchMatchRow {
  id: string;
  user_a: string;
  user_b: string;
  compatibility: CompatibilityResult | null;
  status: 'active' | 'closed';
  created_at: string;
}

export interface MatchMessageRow {
  id: string;
  match_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MatchBlockRow {
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}

export interface MatchReportRow {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  match_id: string | null;
  reason: string;
  detail: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

/** 매칭 후보·매칭 상대에게 공개되는 안전한 프로필 (민감정보 제외). */
export interface PublicMatchCandidate {
  userId: string;
  nickname: string;
  ageBand: string | null;
  gender: 'M' | 'F';
  bio: string | null;
  compatScore: number;
  compatHeadline: string | null;
}
