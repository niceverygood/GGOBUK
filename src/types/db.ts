// Hand-written DB row types matching supabase/migrations/00000000000001_init.sql.
// Regenerate with `supabase gen types` once the project is linked.

import type { Palja, OhaengCount, SipsungMap, SinsalEntry, DaewoonPeriod } from '@/lib/saju/types';

export type RelationType = 'self' | 'family' | 'friend' | 'lover' | 'colleague' | 'other';
export type Persona = 'kkobuk' | 'dosa' | 'mudang' | 'bosal';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired' | 'failed';
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

export interface UserRow {
  id: string;
  nickname: string | null;
  kakao_id: string | null;
  is_pro: boolean;
  pro_expires_at: string | null;
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
  mood: 'happy' | 'calm' | 'focused' | 'cautious' | null;
  created_at: string;
}

export interface CompatibilityResult {
  score: number;
  hap: string[];
  chung: string[];
  highlights: string[];
  cautions: string[];
  summary: string;
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
