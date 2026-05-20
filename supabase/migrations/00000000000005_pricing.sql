-- Pricing v1 (2026-05-20)
--
-- Aligns DB with src/lib/credits.ts and PRICING.md:
--  1. credit_purchases.package_id accepts the actual 4-package set
--     (starter, focus, deep, master) plus legacy 'plus' for any rows
--     already inserted under the old name.
--  2. users.signup_bonus_granted boolean — ensures the 30-credit signup
--     bonus is granted exactly once per account.
--  3. RPC grant_signup_bonus() — idempotent, callable from server bootstrap
--     and from the auth callback. Uses add_credits internally so the
--     transaction shows up in credit_transactions.

-- (1) widen package_id enum check
alter table public.credit_purchases
  drop constraint if exists credit_purchases_package_id_check;
alter table public.credit_purchases
  add constraint credit_purchases_package_id_check
  check (package_id in ('starter','focus','plus','deep','master'));

-- (2) signup bonus tracking column
alter table public.users
  add column if not exists signup_bonus_granted boolean default false not null;

-- (3) RPC: grant 30 credits exactly once per user, then mark flag.
create or replace function public.grant_signup_bonus(p_user_id uuid)
returns int as $$
declare
  v_already boolean;
  v_balance int;
begin
  -- Lock the row to avoid double-grant under concurrent calls.
  select signup_bonus_granted into v_already
  from public.users where id = p_user_id for update;

  if v_already is null then
    raise exception 'user_not_found';
  end if;
  if v_already then
    -- Already granted; just return current balance.
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

revoke all on function public.grant_signup_bonus(uuid) from public, anon, authenticated;
grant execute on function public.grant_signup_bonus(uuid) to service_role;
