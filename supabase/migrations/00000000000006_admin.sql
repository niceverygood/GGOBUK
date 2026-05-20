-- Admin (운영 대시보드)
--
-- 1) users.is_admin flag (manual grant from Supabase, complements env allowlist)
-- 2) admin_overview() — one-shot KPI rollup, service_role only
-- 3) admin helper grants

alter table public.users
  add column if not exists is_admin boolean default false not null;

create or replace function public.admin_overview()
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'users_total',        (select count(*) from public.users),
    'users_today',        (select count(*) from public.users where created_at >= current_date),
    'users_7d',           (select count(*) from public.users where created_at >= current_date - 6),
    'profiles_total',     (select count(*) from public.saju_profiles),
    'profiles_self',      (select count(*) from public.saju_profiles where relation_type = 'self'),
    'chat_sessions',      (select count(*) from public.chat_sessions),
    'chat_messages',      (select count(*) from public.chat_messages),
    'interpretations',    (select count(*) from public.interpretations),
    'relations',          (select count(*) from public.relations),
    'daily_fortunes',     (select count(*) from public.daily_fortunes),
    'paid_count',         (select count(*) from public.credit_purchases where status = 'paid'),
    'revenue_krw',        (select coalesce(sum(amount), 0) from public.credit_purchases where status = 'paid'),
    'revenue_today_krw',  (select coalesce(sum(amount), 0) from public.credit_purchases where status = 'paid' and approved_at >= current_date),
    'credits_issued',     (select coalesce(sum(amount), 0) from public.credit_transactions where kind in ('purchase','bonus','refund')),
    'credits_spent',      (select coalesce(sum(-amount), 0) from public.credit_transactions where kind = 'spend'),
    'credit_balance_total', (select coalesce(sum(credit_balance), 0) from public.users)
  ) into result;
  return result;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;
