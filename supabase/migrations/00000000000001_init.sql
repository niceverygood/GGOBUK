-- 꼬북점 initial schema
create extension if not exists "pgcrypto";

-- users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  kakao_id text unique,
  is_pro boolean default false not null,
  pro_expires_at timestamptz,
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
