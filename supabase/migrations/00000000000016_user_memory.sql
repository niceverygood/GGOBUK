-- 개인화 장기 기억 (페르소나가 과거 대화를 가로질러 사용자를 기억)
--
-- 채팅 응답 후 백그라운드에서 싸구려 모델(haiku)이 "앞으로도 유효할 사실"만
-- 추출해 items(jsonb 배열)에 머지/중복제거하여 저장한다. chatStream 이
-- 시스템 프롬프트에 이 기억을 주입해 "나를 아는" 대화를 만든다.
--
-- 페르소나 공유(유저 단위) — 4 페르소나는 한 캐릭터(꼬북이)의 액세서리 변형이라
-- 기억도 공유하는 게 세계관에 맞고 "안다"는 효과가 가장 크다.
--
-- 민감정보(건강·질병·종교·성적지향·정치성향·정확한 주소/전화)는 추출 단계에서
-- 저장 금지 — 개인정보보호법 민감정보. 사용자는 /more/memory 에서 항목별·전체
-- 삭제 가능(투명성/삭제권).

create table if not exists public.user_memory (
  user_id uuid primary key references public.users(id) on delete cascade,
  items jsonb default '[]'::jsonb not null,
  updated_at timestamptz default now() not null
);

comment on table public.user_memory is
  'Per-user durable memory the personas recall across chat sessions. items = array of {id,text,kind,salience,createdAt,lastSeenAt}. Shared across all personas (one character).';

alter table public.user_memory enable row level security;

-- 본인만 자기 기억을 읽고/지운다. 추출(쓰기)은 서버 service_role 파이프라인이
-- RLS 를 우회해 수행하고, 사용자 본인도 self-policy 로 읽기·삭제 가능.
drop policy if exists "user_memory owner all" on public.user_memory;
create policy "user_memory owner all" on public.user_memory for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
