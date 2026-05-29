-- 2026-05-28: 유저 매칭 — 궁합 기반 모르는 유저 매칭 + 채팅.
--
-- 흐름: opt-in 프로필 등록 → 궁합 점수 기반 후보 추천 → 관심(like) →
-- 상호 like 시 매칭 성사 → 매칭된 쌍만 채팅 가능 → 신고/차단.
--
-- 공개 범위(약관·privacy 8항): 별칭·성별·나이대·궁합점수·한줄소개만.
-- 정확한 생년월일시·이메일·식별자·연락처는 비공개. 후보 추천/매칭 판정은
-- service_role API 가 담당 (RLS 는 본인 데이터만 허용).

-- ── 1) 매칭 프로필 (opt-in) ──
create table if not exists public.match_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  opt_in boolean default false not null,
  display_nickname text not null,
  -- 정확한 생일 대신 나이대만 공개 ('20대 초반' 등)
  age_band text,
  gender text not null check (gender in ('M','F')),
  -- 보고 싶은 상대 성별
  gender_pref text default 'any' not null check (gender_pref in ('M','F','any')),
  bio text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_match_profiles_active
  on public.match_profiles(opt_in, is_active, gender);

alter table public.match_profiles enable row level security;
drop policy if exists "match_profiles self" on public.match_profiles;
create policy "match_profiles self" on public.match_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 2) 관심(like) — 상호 like 시 매칭 ──
create table if not exists public.match_likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references public.users(id) on delete cascade not null,
  to_user_id uuid references public.users(id) on delete cascade not null,
  -- 'like' | 'pass' (pass 도 기록해 재추천 방지)
  action text default 'like' not null check (action in ('like','pass')),
  created_at timestamptz default now() not null,
  unique(from_user_id, to_user_id)
);
create index if not exists idx_match_likes_from
  on public.match_likes(from_user_id, created_at desc);
create index if not exists idx_match_likes_to
  on public.match_likes(to_user_id);

alter table public.match_likes enable row level security;
-- 내가 보낸 like 만 보고/생성. 받은 like 노출은 service_role API 로 통제.
drop policy if exists "match_likes own" on public.match_likes;
create policy "match_likes own" on public.match_likes for all
  using (auth.uid() = from_user_id) with check (auth.uid() = from_user_id);

-- ── 3) 매칭 성사 (상호 like) ──
-- user_a < user_b 정규화로 중복 방지 (쌍은 하나의 row).
create table if not exists public.match_matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references public.users(id) on delete cascade not null,
  user_b uuid references public.users(id) on delete cascade not null,
  compatibility jsonb,
  status text default 'active' not null check (status in ('active','closed')),
  created_at timestamptz default now() not null,
  unique(user_a, user_b),
  check (user_a < user_b)
);
create index if not exists idx_match_matches_a on public.match_matches(user_a);
create index if not exists idx_match_matches_b on public.match_matches(user_b);

alter table public.match_matches enable row level security;
drop policy if exists "match_matches member" on public.match_matches;
create policy "match_matches member" on public.match_matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ── 4) 채팅 메시지 (매칭된 쌍만) ──
create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.match_matches(id) on delete cascade not null,
  sender_user_id uuid references public.users(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now() not null,
  read_at timestamptz
);
create index if not exists idx_match_messages_match
  on public.match_messages(match_id, created_at);

alter table public.match_messages enable row level security;
-- 내가 속한 매칭의 메시지만 조회. 발신은 본인 + 그 매칭 멤버일 때.
drop policy if exists "match_messages read" on public.match_messages;
create policy "match_messages read" on public.match_messages for select
  using (
    exists (
      select 1 from public.match_matches m
      where m.id = match_messages.match_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and m.status = 'active'
    )
  );
drop policy if exists "match_messages send" on public.match_messages;
create policy "match_messages send" on public.match_messages for insert
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.match_matches m
      where m.id = match_messages.match_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and m.status = 'active'
    )
  );

-- ── 5) 차단 ──
create table if not exists public.match_blocks (
  blocker_user_id uuid references public.users(id) on delete cascade not null,
  blocked_user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (blocker_user_id, blocked_user_id)
);
alter table public.match_blocks enable row level security;
drop policy if exists "match_blocks own" on public.match_blocks;
create policy "match_blocks own" on public.match_blocks for all
  using (auth.uid() = blocker_user_id) with check (auth.uid() = blocker_user_id);

-- ── 6) 신고 ──
create table if not exists public.match_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.users(id) on delete cascade not null,
  reported_user_id uuid references public.users(id) on delete cascade not null,
  match_id uuid references public.match_matches(id) on delete set null,
  reason text not null,
  detail text,
  status text default 'pending' not null check (status in ('pending','reviewed','actioned','dismissed')),
  created_at timestamptz default now() not null
);
create index if not exists idx_match_reports_status
  on public.match_reports(status, created_at desc);

alter table public.match_reports enable row level security;
-- 신고 생성은 본인이, 조회는 본인 신고 건만 (처리는 service_role/admin).
drop policy if exists "match_reports insert" on public.match_reports;
create policy "match_reports insert" on public.match_reports for insert
  with check (auth.uid() = reporter_user_id);
drop policy if exists "match_reports own select" on public.match_reports;
create policy "match_reports own select" on public.match_reports for select
  using (auth.uid() = reporter_user_id);
