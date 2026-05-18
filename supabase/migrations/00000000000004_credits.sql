-- Credit-based billing

alter table public.users
  add column if not exists credit_balance int default 0 not null
  check (credit_balance >= 0);

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  partner_order_id text unique not null,
  kakao_tid text not null,
  package_id text not null check (package_id in ('starter','plus','deep')),
  credits int not null,
  bonus_credits int default 0 not null,
  amount int not null,
  status text default 'pending' not null
    check (status in ('pending','paid','cancelled','failed')),
  approved_at timestamptz,
  payment_method_type text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_credit_purchases_user on public.credit_purchases(user_id, status, created_at desc);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  kind text not null check (kind in ('purchase','spend','refund','bonus')),
  amount int not null,
  balance_after int not null,
  reason text not null,
  reference_id text,
  kakao_tid text,
  package_id text,
  price_krw int,
  created_at timestamptz default now() not null
);
create index if not exists idx_credit_transactions_user on public.credit_transactions(user_id, created_at desc);

drop trigger if exists credit_purchases_updated_at on public.credit_purchases;
create trigger credit_purchases_updated_at before update on public.credit_purchases
  for each row execute function set_updated_at();

alter table public.credit_purchases enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists "credit purchases select own" on public.credit_purchases;
create policy "credit purchases select own" on public.credit_purchases
  for select using (auth.uid() = user_id);

drop policy if exists "credit transactions select own" on public.credit_transactions;
create policy "credit transactions select own" on public.credit_transactions
  for select using (auth.uid() = user_id);

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

revoke all on function public.add_credits(uuid, int, text, text, text, text, text, int) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, int, text, text) from public, anon, authenticated;
grant execute on function public.add_credits(uuid, int, text, text, text, text, text, int) to service_role;
grant execute on function public.spend_credits(uuid, int, text, text) to service_role;
