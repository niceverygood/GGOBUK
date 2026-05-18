-- 꼬북점 initial schema
create extension if not exists "pgcrypto";

-- users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  kakao_id text unique,
  is_pro boolean default false not null,
  pro_expires_at timestamptz,
  credit_balance int default 0 not null check (credit_balance >= 0),
  push_enabled boolean default false not null,
  push_token text,
  push_time time default '07:00' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- saju profiles (self + relations)
create table public.saju_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  birth_date date not null,
  birth_time time,
  is_lunar boolean default false not null,
  is_leap_month boolean default false not null,
  gender char(1) check (gender in ('M','F')) not null,
  relation_type text default 'self' not null
    check (relation_type in ('self','family','friend','lover','colleague','other')),
  relation_label text,
  palja jsonb,
  ohaeng_count jsonb,
  sipsung jsonb,
  sinsal jsonb,
  daewoon jsonb,
  ilgan text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_saju_owner on public.saju_profiles(owner_id);
create index idx_saju_owner_self on public.saju_profiles(owner_id) where relation_type = 'self';

-- 12 interpretations (LLM cache)
create table public.interpretations (
  id uuid primary key default gen_random_uuid(),
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  category text not null
    check (category in ('overview','ohaeng','ilju','strength','weakness',
                        'personality','career','wealth','love','family',
                        'friends','direction')),
  content text not null,
  model text,
  tokens_used int,
  generated_at timestamptz default now() not null,
  unique(saju_id, category)
);

-- chat sessions
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  persona text not null check (persona in ('kkobuk','dosa','mudang','bosal')),
  title text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_chat_user on public.chat_sessions(user_id, updated_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  cited_cards jsonb,
  tokens_used int,
  created_at timestamptz default now() not null
);
create index idx_chat_messages_session on public.chat_messages(session_id, created_at);

-- daily fortunes
create table public.daily_fortunes (
  id uuid primary key default gen_random_uuid(),
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  date date not null,
  ilji_gan text not null,
  ilji_ji text not null,
  one_liner text not null,
  lucky_color text,
  lucky_number int,
  lucky_direction text,
  recommend jsonb,
  avoid jsonb,
  mood text,
  created_at timestamptz default now() not null,
  unique(saju_id, date)
);
create index idx_daily_date on public.daily_fortunes(date);

-- relations (edges)
create table public.relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  saju_a_id uuid references public.saju_profiles(id) on delete cascade not null,
  saju_b_id uuid references public.saju_profiles(id) on delete cascade not null,
  compatibility jsonb,
  created_at timestamptz default now() not null,
  check (saju_a_id <> saju_b_id),
  unique(saju_a_id, saju_b_id)
);

-- timeline feedback
create table public.timeline_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  daewoon_start_year int not null,
  coldread_text text not null,
  feedback text check (feedback in ('correct','wrong','partial')),
  created_at timestamptz default now() not null
);

-- subscriptions (Kakao Pay)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  kakao_sid text not null,
  plan text check (plan in ('monthly','yearly')) not null,
  status text check (status in ('pending','active','cancelled','expired','failed')) not null,
  amount int not null,
  started_at timestamptz,
  expires_at timestamptz,
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index idx_subs_user on public.subscriptions(user_id, status);

-- credit purchases (Kakao Pay one-time charge)
create table public.credit_purchases (
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
create index idx_credit_purchases_user on public.credit_purchases(user_id, status, created_at desc);

create table public.credit_transactions (
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
create index idx_credit_transactions_user on public.credit_transactions(user_id, created_at desc);

-- usage limits
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  chat_messages int default 0 not null,
  interpretations_viewed int default 0 not null,
  unique(user_id, date)
);

-- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function set_updated_at();
create trigger saju_updated_at before update on public.saju_profiles
  for each row execute function set_updated_at();
create trigger chat_sessions_updated_at before update on public.chat_sessions
  for each row execute function set_updated_at();
create trigger subs_updated_at before update on public.subscriptions
  for each row execute function set_updated_at();
create trigger credit_purchases_updated_at before update on public.credit_purchases
  for each row execute function set_updated_at();
-- Row Level Security
alter table public.users enable row level security;
alter table public.saju_profiles enable row level security;
alter table public.interpretations enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.daily_fortunes enable row level security;
alter table public.relations enable row level security;
alter table public.timeline_feedback enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.usage_logs enable row level security;

create policy "users select self" on public.users for select using (auth.uid() = id);
create policy "users update self" on public.users for update using (auth.uid() = id);
create policy "users insert self" on public.users for insert with check (auth.uid() = id);

create policy "saju all own" on public.saju_profiles for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "interp select own" on public.interpretations for select using (
  exists (select 1 from public.saju_profiles sp where sp.id = saju_id and sp.owner_id = auth.uid())
);
create policy "interp insert own" on public.interpretations for insert with check (
  exists (select 1 from public.saju_profiles sp where sp.id = saju_id and sp.owner_id = auth.uid())
);

create policy "chat sessions all own" on public.chat_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chat messages all own" on public.chat_messages for all using (
  exists (select 1 from public.chat_sessions cs where cs.id = session_id and cs.user_id = auth.uid())
) with check (
  exists (select 1 from public.chat_sessions cs where cs.id = session_id and cs.user_id = auth.uid())
);

create policy "daily all own" on public.daily_fortunes for all using (
  exists (select 1 from public.saju_profiles sp where sp.id = saju_id and sp.owner_id = auth.uid())
) with check (
  exists (select 1 from public.saju_profiles sp where sp.id = saju_id and sp.owner_id = auth.uid())
);

create policy "relations all own" on public.relations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "timeline feedback all own" on public.timeline_feedback for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subs select own" on public.subscriptions for select using (auth.uid() = user_id);

create policy "credit purchases select own" on public.credit_purchases
  for select using (auth.uid() = user_id);

create policy "credit transactions select own" on public.credit_transactions
  for select using (auth.uid() = user_id);

create policy "usage all own" on public.usage_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Helper RPCs

-- Increment chat_messages counter for today's row, creating it if missing.
create or replace function public.increment_chat_usage(p_user_id uuid)
returns void as $$
begin
  insert into public.usage_logs (user_id, date, chat_messages)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set chat_messages = usage_logs.chat_messages + 1;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.increment_chat_usage(uuid) from public;
grant execute on function public.increment_chat_usage(uuid) to authenticated;

-- Increment interpretation views (for soft limit/analytics).
create or replace function public.increment_interp_views(p_user_id uuid)
returns void as $$
begin
  insert into public.usage_logs (user_id, date, interpretations_viewed)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set interpretations_viewed = usage_logs.interpretations_viewed + 1;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.increment_interp_views(uuid) from public;
grant execute on function public.increment_interp_views(uuid) to authenticated;

-- Credit ledger helpers. These are service-role only because they mutate balance.
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
