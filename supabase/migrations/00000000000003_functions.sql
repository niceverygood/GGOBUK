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
