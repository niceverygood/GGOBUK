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

create policy "usage all own" on public.usage_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
