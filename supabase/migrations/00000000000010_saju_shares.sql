-- 사주 결과 공유 — 공개 URL로 비로그인 친구가 볼 수 있는 스냅샷.
--
-- 핵심 의도:
-- - 공유 시점의 content를 스냅샷으로 저장. 호스트가 나중에 풀이를 재생성해도
--   공유된 링크의 내용은 그대로 유지.
-- - 기본 30일 만료. expire 후엔 공개 페이지가 "만료된 링크"로 응답.
-- - 비로그인 GET은 service_role API를 거쳐서만 가능 (RLS는 host만).

create table if not exists public.saju_shares (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  -- 공유 유형: 단일 카테고리 풀이 / 전체 사주 카드
  kind text not null default 'interpretation'
    check (kind in ('interpretation', 'overview')),
  -- interpretation 전용 메타
  category text,
  persona text
    check (persona is null or persona in ('kkobuk', 'dosa', 'mudang', 'bosal')),
  -- 공유 시점 스냅샷
  title text,
  owner_name text,
  content_snapshot text not null,
  palja_snapshot jsonb,
  -- 운영
  view_count int default 0 not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '30 days') not null
);

create index if not exists idx_saju_shares_owner
  on public.saju_shares(owner_id, created_at desc);
create index if not exists idx_saju_shares_token
  on public.saju_shares(token);

alter table public.saju_shares enable row level security;

-- host(만든 사람)는 자기 공유 전체 보고/관리. 공개 GET은 service_role API로.
drop policy if exists "saju_shares host all" on public.saju_shares;
create policy "saju_shares host all" on public.saju_shares for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
