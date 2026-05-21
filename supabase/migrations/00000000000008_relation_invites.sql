-- 인연 친구 초대 (궁합 초대 링크, 바이럴)
--
-- host가 초대 링크를 만들고, 친구가 비로그인 상태로 본인 사주를 입력하면
-- host의 인연으로 추가되고 궁합이 자동 계산된다.
-- 공개 토큰 조회/완료는 서버(service_role)에서 처리한다.

create table if not exists public.relation_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  host_user_id uuid references public.users(id) on delete cascade not null,
  host_saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  status text default 'pending' not null
    check (status in ('pending','completed','expired')),
  guest_name text,
  guest_saju_id uuid references public.saju_profiles(id) on delete set null,
  compatibility jsonb,
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '14 days') not null,
  completed_at timestamptz
);
create index if not exists idx_relation_invites_host
  on public.relation_invites(host_user_id, created_at desc);
create index if not exists idx_relation_invites_token
  on public.relation_invites(token);

alter table public.relation_invites enable row level security;

-- host는 자기 초대만 보고 만들 수 있다. (공개 조회/완료는 service_role API)
drop policy if exists "relation_invites host all" on public.relation_invites;
create policy "relation_invites host all" on public.relation_invites for all
  using (auth.uid() = host_user_id) with check (auth.uid() = host_user_id);
