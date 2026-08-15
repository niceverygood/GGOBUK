-- Phase 1 Foundation — 리포트 파이프라인 + 무료권 (2026-08-14)
--
--   1) reports        모든 유료 리포트의 공통 저장소 (전체사주·궁합·대운·연도별·택일·월별)
--   2) report_jobs    비동기 생성 job (lease / heartbeat / attempt)
--   3) entitlements   무료권 window (채팅 질문권 KST 23:00, 오늘의 운세 KST 00:00)
--
-- 설계 노트
--  - 상태 전이는 **compare-and-swap** 으로만 한다. 허용된 이전 상태를 WHERE 에 넣는
--    RPC(`report_transition`)를 두고, 앱은 직접 UPDATE 하지 않는다.
--    허용표는 src/domain/reports/state.ts 와 1:1 로 맞춘다.
--  - 결과 테이블은 **서버 전용 쓰기**다. 사용자에게는 소유 SELECT 만 준다
--    (migration 18·19 에서 확립한 원칙 — 유료 결과 위조 차단).
--  - 무료권은 "예약(reserve) → 소비(consume) | 반환(release)" 3단계다.
--    AI 호출 **전에** 예약하고, 성공하면 소비, 실패/타임아웃이면 정확히 한 번 반환한다(§8.7).
--
-- ─────────────────────────── PREFLIGHT (읽기 전용) ───────────────────────────
--  select to_regclass('public.reports'), to_regclass('public.report_jobs'),
--         to_regclass('public.entitlements');
--  select count(*) from public.interpretations;   -- 기존 풀이 수 (adapter 대상)
--
-- ─────────────────────────── ROLLBACK ───────────────────────────
--  drop function if exists public.entitlement_release(uuid, text, uuid);
--  drop function if exists public.entitlement_consume(uuid, text, uuid);
--  drop function if exists public.entitlement_reserve(uuid, text, timestamptz, timestamptz, int);
--  drop function if exists public.report_claim_job(int);
--  drop function if exists public.report_transition(uuid, text, text, jsonb);
--  drop table if exists public.report_jobs;
--  drop table if exists public.entitlements;
--  drop table if exists public.reports;
--  (기존 interpretations 는 건드리지 않으므로 데이터 손실 없음)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) reports
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade not null,

  type text not null check (type in (
    'full_saju','compatibility','daewoon','yearly','lucky_day','monthly','jamidusu'
  )),

  primary_profile_id uuid references public.saju_profiles(id) on delete set null,
  secondary_profile_id uuid references public.saju_profiles(id) on delete set null,

  -- 생성 당시 프로필 스냅샷. 프로필이 수정·삭제돼도 결과는 원본 기준으로 재현된다(§7.1).
  primary_snapshot jsonb,
  secondary_snapshot jsonb,
  -- 스냅샷 + 입력 + 프롬프트 버전의 해시. 동일 조합 재구매를 막는 identity.
  input jsonb not null default '{}'::jsonb,
  identity_hash text,

  preview jsonb,
  premium_result jsonb,

  state text not null default 'draft' check (state in (
    'draft','previewing','preview_ready','payment_pending',
    'queued','generating','completed','failed','cancelled'
  )),

  -- 결제 스냅샷 (§2.4 — 새 정책을 소급하지 않기 위해 구매 시점 값을 박는다)
  price_asset text check (price_asset in ('EGG','LEAF','CHAT_TURN')),
  price_amount int,
  policy_version text,
  charged_at timestamptz,
  refunded_at timestamptz,

  -- 생성 메타
  model text,
  prompt_version text,
  calculation_version text,
  tokens_used int,

  idempotency_key text,
  error_code text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  completed_at timestamptz,
  deleted_at timestamptz
);

create index if not exists reports_owner_idx
  on public.reports(owner_id, created_at desc);
create index if not exists reports_owner_type_idx
  on public.reports(owner_id, type, created_at desc);
create index if not exists reports_state_idx
  on public.reports(state) where state in ('queued','generating');

-- 멱등키는 사용자 범위에서 유일 — 같은 키로 재시도해도 리포트가 늘지 않는다.
create unique index if not exists reports_idempotency_uniq
  on public.reports(owner_id, idempotency_key)
  where idempotency_key is not null;

-- 완료된 동일 identity 는 하나만. 재열람은 무료이고, 재생성은 명시적으로 새 행을 만든다.
create unique index if not exists reports_identity_uniq
  on public.reports(owner_id, type, identity_hash)
  where identity_hash is not null and state = 'completed' and deleted_at is null;

drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at before update on public.reports
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) report_jobs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade not null unique,

  state text not null default 'queued' check (state in (
    'queued','running','succeeded','failed'
  )),
  attempt int default 0 not null,
  max_attempts int default 3 not null,

  -- worker 가 잡은 임대. 만료되면 다른 worker 가 회수한다(죽은 worker 복구).
  lease_until timestamptz,
  heartbeat_at timestamptz,

  started_at timestamptz,
  finished_at timestamptz,
  error_code text,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists report_jobs_claimable_idx
  on public.report_jobs(state, lease_until)
  where state in ('queued','running');

drop trigger if exists report_jobs_updated_at on public.report_jobs;
create trigger report_jobs_updated_at before update on public.report_jobs
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) entitlements — 무료권 window
--
--    granted / reserved / consumed / released 로 나눠 "예약했는데 실패" 를 복구한다.
--    가용 수량 = granted - consumed - reserved
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,

  type text not null check (type in ('chat_question','daily_fortune')),

  window_start timestamptz not null,
  window_end timestamptz not null,

  granted int default 0 not null check (granted >= 0),
  reserved int default 0 not null check (reserved >= 0),
  consumed int default 0 not null check (consumed >= 0),
  released int default 0 not null check (released >= 0),

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(user_id, type, window_start),
  -- 초과 소비 방지 — DB 가 최종 방어선이다.
  constraint entitlements_within_grant
    check (reserved + consumed <= granted)
);

create index if not exists entitlements_lookup_idx
  on public.entitlements(user_id, type, window_start desc);

drop trigger if exists entitlements_updated_at on public.entitlements;
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS — 사용자는 본인 소유 SELECT 만. 쓰기는 전부 server-only.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.reports enable row level security;
alter table public.report_jobs enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "reports select own" on public.reports;
create policy "reports select own" on public.reports for select
  using (auth.uid() = owner_id);

drop policy if exists "entitlements select own" on public.entitlements;
create policy "entitlements select own" on public.entitlements for select
  using (auth.uid() = user_id);

-- report_jobs 는 사용자에게 노출하지 않는다(진행 상태는 reports.state 로 충분).
-- 정책을 두지 않으면 RLS 가 전부 거부한다.

revoke insert, update, delete on public.reports from anon, authenticated;
revoke all on public.report_jobs from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) report_transition() — compare-and-swap 상태 전이
--
--    허용표는 src/domain/reports/state.ts 와 동일하다. 둘이 어긋나면 테스트가 잡는다.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.report_transition(
  p_report_id uuid,
  p_from text,
  p_to text,
  p_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_allowed boolean;
  v_updated int;
begin
  select owner_id into v_owner from public.reports where id = p_report_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'report_not_found');
  end if;

  if not (public.is_service_role() or auth.uid() = v_owner) then
    raise exception 'forbidden';
  end if;

  v_allowed := case p_from
    when 'draft'           then p_to in ('previewing','cancelled')
    when 'previewing'      then p_to in ('preview_ready','failed','cancelled')
    when 'preview_ready'   then p_to in ('payment_pending','cancelled')
    when 'payment_pending' then p_to in ('queued','failed','cancelled')
    when 'queued'          then p_to in ('generating','failed','cancelled')
    when 'generating'      then p_to in ('completed','failed','queued')
    when 'failed'          then p_to in ('queued','cancelled')
    else false
  end;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'error', 'invalid_state_transition');
  end if;

  -- CAS: 현재 상태가 p_from 일 때만 바뀐다. 동시 요청 중 하나만 성공한다.
  update public.reports
     set state         = p_to,
         preview       = coalesce(p_patch->'preview', preview),
         premium_result= coalesce(p_patch->'premium_result', premium_result),
         error_code    = case when p_patch ? 'error_code'
                              then nullif(p_patch->>'error_code','')
                              else error_code end,
         model         = coalesce(p_patch->>'model', model),
         prompt_version= coalesce(p_patch->>'prompt_version', prompt_version),
         tokens_used   = coalesce((p_patch->>'tokens_used')::int, tokens_used),
         completed_at  = case when p_to = 'completed' then now() else completed_at end
   where id = p_report_id
     and state = p_from;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_state_transition');
  end if;

  return jsonb_build_object('ok', true, 'state', p_to);
end;
$$;

revoke all on function public.report_transition(uuid, text, text, jsonb) from public;
grant execute on function public.report_transition(uuid, text, text, jsonb)
  to service_role, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) entitlement_reserve / consume / release
--
--    window 행이 없으면 만들고 granted 를 채운다(첫 사용 시점 lazy grant).
--    가용분이 없으면 reserved=false 를 돌려주고 호출자가 유료 경로로 넘어간다.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.entitlement_reserve(
  p_user_id uuid,
  p_type text,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_grant int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entitlements%rowtype;
begin
  if not (public.is_service_role() or auth.uid() = p_user_id) then
    raise exception 'forbidden';
  end if;

  insert into public.entitlements
    (user_id, type, window_start, window_end, granted)
  values
    (p_user_id, p_type, p_window_start, p_window_end, p_grant)
  on conflict (user_id, type, window_start) do nothing;

  -- 행 잠금 후 가용분 확인 (동시 요청 직렬화)
  select * into v_row from public.entitlements
   where user_id = p_user_id and type = p_type and window_start = p_window_start
   for update;

  if (v_row.granted - v_row.reserved - v_row.consumed) <= 0 then
    return jsonb_build_object('ok', true, 'reserved', false,
      'available', 0, 'entitlement_id', v_row.id);
  end if;

  update public.entitlements
     set reserved = reserved + 1
   where id = v_row.id;

  return jsonb_build_object('ok', true, 'reserved', true,
    'available', v_row.granted - v_row.reserved - v_row.consumed - 1,
    'entitlement_id', v_row.id);
end;
$$;

create or replace function public.entitlement_consume(
  p_user_id uuid,
  p_type text,
  p_entitlement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if not (public.is_service_role() or auth.uid() = p_user_id) then
    raise exception 'forbidden';
  end if;

  update public.entitlements
     set reserved = reserved - 1,
         consumed = consumed + 1
   where id = p_entitlement_id
     and user_id = p_user_id
     and type = p_type
     and reserved > 0;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', v_updated = 1);
end;
$$;

create or replace function public.entitlement_release(
  p_user_id uuid,
  p_type text,
  p_entitlement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if not (public.is_service_role() or auth.uid() = p_user_id) then
    raise exception 'forbidden';
  end if;

  -- 예약분만 되돌린다. 이미 consume 된 건은 건드리지 않는다(이중 반환 방지).
  update public.entitlements
     set reserved = reserved - 1,
         released = released + 1
   where id = p_entitlement_id
     and user_id = p_user_id
     and type = p_type
     and reserved > 0;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', v_updated = 1);
end;
$$;

revoke all on function public.entitlement_reserve(uuid, text, timestamptz, timestamptz, int) from public;
revoke all on function public.entitlement_consume(uuid, text, uuid) from public;
revoke all on function public.entitlement_release(uuid, text, uuid) from public;
grant execute on function public.entitlement_reserve(uuid, text, timestamptz, timestamptz, int)
  to service_role, anon, authenticated;
grant execute on function public.entitlement_consume(uuid, text, uuid)
  to service_role, anon, authenticated;
grant execute on function public.entitlement_release(uuid, text, uuid)
  to service_role, anon, authenticated;

notify pgrst, 'reload schema';
