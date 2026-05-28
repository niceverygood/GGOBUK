-- App Store 5.1.1(i)/5.1.2(i) — AI 데이터 사용 동의 타임스탬프.
-- NULL 이면 아직 동의 안 함 → 채팅/해석 API는 412 PRECONDITION REQUIRED 반환.

alter table public.users
  add column if not exists ai_consent_at timestamptz;

comment on column public.users.ai_consent_at is
  'When the user explicitly agreed to send saju + chat data to Anthropic Claude. NULL until consent.';

-- 익명/테스트 계정도 동의 게이트를 통과해야 한다.
-- (RLS 는 기존 users self-policy 그대로 유효)
