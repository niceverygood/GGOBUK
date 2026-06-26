-- 카카오톡 채널 챗봇 사용자 (앱 회원가입 없이 카카오톡 채널에서 바로 사주 상담)
--
-- 헬로우봇 같은 카카오톡 채널 챗봇으로 꼬북점이 응대하려면, 카톡 채널 사용자는
-- 앱의 auth.users 와 무관한 익명 봇 사용자다. 카카오 i 오픈빌더 스킬 요청의
-- userRequest.user.id(= bot user key, 채널·봇 스코프 고유키)를 PK 로 삼아
-- 그 사람의 생년월일/성별/페르소나/최근 대화를 보관한다.
--
-- 한 번 생년월일을 받으면 매 대화마다 사주를 재계산할 수 있으므로 팔자 캐시는
-- 두지 않는다(코드가 buildSajuResult 로 즉석 계산). history 는 최근 대화 맥락용
-- jsonb 배열({role,content}) 로 최근 N턴만 유지한다.
--
-- 민감정보(건강·종교·성적지향 등)는 저장하지 않는다. 사용자는 "정보 변경"·"삭제"
-- 발화로 자기 데이터를 초기화할 수 있다(삭제권).

create table if not exists public.kakao_chat_users (
  bot_user_key text primary key,
  name text,
  birth_date date,
  birth_time text,
  is_lunar boolean not null default false,
  is_leap_month boolean not null default false,
  gender text check (gender in ('M', 'F')),
  persona text not null default 'kkobuk',
  history jsonb not null default '[]'::jsonb,
  -- 비용 가드용 일일 메시지 카운터 (KST 날짜 기준 리셋)
  msg_count integer not null default 0,
  count_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kakao_chat_users is
  'KakaoTalk channel chatbot users (no app account). Keyed by Kakao i Open Builder bot user key. Stores birth info + persona + recent chat history for the skill server.';

-- service_role(서버 admin 클라이언트)만 접근한다. 이 사용자들은 auth.uid 가 없는
-- 익명 봇 사용자라 self-policy 가 성립하지 않는다. permissive 정책을 두지 않으면
-- anon/authenticated 는 잠기고, 스킬 서버의 admin 클라이언트만 RLS 를 우회한다.
alter table public.kakao_chat_users enable row level security;
