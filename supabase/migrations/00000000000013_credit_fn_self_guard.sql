-- 2026-05-28: service_role 폴백 우회 — 크레딧 함수에 내부 보안 체크.
--
-- 배경: PostgREST 가 SUPABASE_SERVICE_ROLE_KEY 로 온 RPC 호출을 RLS 에선
-- service_role 로 인정하지만 함수 EXECUTE 권한 체크에서 anon 으로 폴백시켜
-- spend_credits 가 permission denied(42501) 가 됨.
--
-- 해결: 세 함수에 anon/authenticated EXECUTE 를 부여하되, 함수 내부에서
-- 호출자를 직접 검증한다.
--   - spend_credits: 본인(auth.uid=p_user_id) 또는 service_role JWT 만 차감.
--   - add_credits / grant_signup_bonus: service_role JWT 만 (server-only).
-- 이렇게 하면 anon key 로 임의 호출해도 타인 크레딧 조작/파밍이 차단된다.

-- JWT claim 의 role 이 service_role 인지. PostgREST 버전별 GUC 위치 둘 다 시도.
create or replace function public.is_service_role()
returns boolean
language plpgsql
stable
as $$
declare
  v_role text := '';
begin
  begin
    v_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  exception when others then
    v_role := '';
  end;
  if v_role = '' then
    begin
      v_role := coalesce(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
        ''
      );
    exception when others then
      v_role := '';
    end;
  end if;
  return v_role = 'service_role';
end;
$$;

-- spend_credits — 본인 차감 또는 service_role.
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_reference_id text default null
)
returns int as $$
declare
  v_balance int;
begin
  if not (p_user_id = auth.uid() or public.is_service_role()) then
    raise exception 'forbidden';
  end if;
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  update public.users
  set credit_balance = credit_balance - p_amount
  where id = p_user_id and credit_balance >= p_amount
  returning credit_balance into v_balance;
  if v_balance is null then
    raise exception 'insufficient_credits';
  end if;
  insert into public.credit_transactions (
    user_id, kind, amount, balance_after, reason, reference_id
  )
  values (p_user_id, 'spend', -p_amount, v_balance, p_reason, p_reference_id);
  return v_balance;
end;
$$ language plpgsql security definer set search_path = public;

-- add_credits — service_role 만 (결제 webhook·초대 보상 등 server-only).
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_kind text default 'purchase',
  p_reference_id text default null,
  p_kakao_tid text default null,
  p_package_id text default null,
  p_price_krw int default null
)
returns int as $$
declare
  v_balance int;
begin
  if not public.is_service_role() then
    raise exception 'forbidden';
  end if;
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  if p_kind not in ('purchase','refund','bonus') then
    raise exception 'invalid_credit_kind';
  end if;
  update public.users
  set credit_balance = credit_balance + p_amount
  where id = p_user_id
  returning credit_balance into v_balance;
  if v_balance is null then
    raise exception 'user_not_found';
  end if;
  insert into public.credit_transactions (
    user_id, kind, amount, balance_after, reason, reference_id,
    kakao_tid, package_id, price_krw
  )
  values (
    p_user_id, p_kind, p_amount, v_balance, p_reason, p_reference_id,
    p_kakao_tid, p_package_id, p_price_krw
  );
  return v_balance;
end;
$$ language plpgsql security definer set search_path = public;

-- grant_signup_bonus — service_role 만. 내부 add_credits 는 definer 권한으로 호출됨.
create or replace function public.grant_signup_bonus(p_user_id uuid)
returns int as $$
declare
  v_already boolean;
  v_balance int;
begin
  if not public.is_service_role() then
    raise exception 'forbidden';
  end if;
  select signup_bonus_granted into v_already
  from public.users where id = p_user_id for update;
  if v_already is null then
    raise exception 'user_not_found';
  end if;
  if v_already then
    select credit_balance into v_balance from public.users where id = p_user_id;
    return v_balance;
  end if;
  v_balance := public.add_credits(
    p_user_id := p_user_id,
    p_amount := 30,
    p_reason := '신규 가입 보너스',
    p_kind := 'bonus',
    p_reference_id := 'signup_bonus'
  );
  update public.users set signup_bonus_granted = true where id = p_user_id;
  return v_balance;
end;
$$ language plpgsql security definer set search_path = public;

-- 권한 — 내부 보안 체크가 fail-safe 라 anon/authenticated 에도 EXECUTE 부여.
grant execute on function public.is_service_role() to service_role, anon, authenticated;
grant execute on function public.spend_credits(uuid, int, text, text) to service_role, anon, authenticated;
grant execute on function public.add_credits(uuid, int, text, text, text, text, text, int) to service_role, anon, authenticated;
grant execute on function public.grant_signup_bonus(uuid) to service_role, anon, authenticated;

notify pgrst, 'reload schema';
