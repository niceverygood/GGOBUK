-- Migration 17: 광고 퍼널 분석 & 어트리뷰션
--
-- 페이스북(및 일반) 광고 유입 → 가입 → 온보딩 → 활성화 → 결제 깔때기를
-- 측정하고, 캠페인(utm_campaign)·소스(utm_source)별로 쪼개 보기 위한 인프라.
--
-- 설계 원칙
--  · 가입 이후 단계(가입/온보딩/활성화/결제)는 도메인 테이블(users·saju_profiles·
--    chat_sessions·credit_purchases)에서 직접 집계한다 — 광고 차단·iOS ATT 로
--    유실되는 클라이언트 이벤트보다 신뢰도가 높다.
--  · 가입 "이전"의 방문(익명 랜딩)만 analytics_events(page_view)로 측정한다.
--  · first-touch 어트리뷰션은 users 행에 1:1 로 박아두고(가입 시 쿠키에서 복사),
--    이후 모든 코호트 집계를 users.attr_* 로 group by 한다.
--
--  1) users 에 first-touch 어트리뷰션 컬럼
--  2) analytics_events  append-only 이벤트 로그 (익명 포함, anon_id 로 stitch)
--  3) admin_funnel(days) RPC — 단계 카운트 + 소스/캠페인 브레이크다운 + 일별 추이

-- ─────────────────────────────────────────────────────────────
-- 1) first-touch 어트리뷰션 (users 1:1)
-- ─────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists attr_source       text,
  add column if not exists attr_medium       text,
  add column if not exists attr_campaign      text,
  add column if not exists attr_content       text,
  add column if not exists attr_term          text,
  add column if not exists attr_fbclid        text,
  add column if not exists attr_landing_path  text,
  add column if not exists attr_referrer      text,
  add column if not exists attr_first_seen_at timestamptz;

-- 캠페인/소스 group by 가속.
create index if not exists users_attr_campaign_idx on public.users (attr_campaign);
create index if not exists users_attr_source_idx   on public.users (attr_source);

-- ─────────────────────────────────────────────────────────────
-- 2) analytics_events — append-only 이벤트 로그
--    익명(anon_id) + 로그인(user_id) 둘 다 기록. 어트리뷰션 스냅샷 동반.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  event_name   text not null,
  user_id      uuid references public.users (id) on delete set null,
  anon_id      text,
  -- 이벤트 시점의 first-touch 어트리뷰션 스냅샷 (쿠키에서 복사).
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  fbclid       text,
  landing_path text,
  referrer     text,
  path         text,
  value_krw    integer,                       -- 결제 등 금액성 이벤트용.
  props        jsonb not null default '{}'::jsonb,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists analytics_events_name_time_idx on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_created_idx    on public.analytics_events (created_at desc);
create index if not exists analytics_events_anon_idx       on public.analytics_events (anon_id);
create index if not exists analytics_events_user_idx       on public.analytics_events (user_id);
create index if not exists analytics_events_campaign_idx   on public.analytics_events (utm_campaign);

-- RLS: 정책을 두지 않아 anon/authenticated 는 읽기·쓰기 모두 불가.
-- 기록(/api/track)·조회(admin)는 service_role(RLS 우회) 로만 수행한다.
alter table public.analytics_events enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 3) admin_funnel(days) — 운영 대시보드용 퍼널 롤업
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_funnel(p_days int default 14)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  d      int := greatest(coalesce(p_days, 14), 1);
  since  timestamptz := now() - make_interval(days => d);
begin
  with
  -- 기간 내 가입 코호트 + 어트리뷰션(빈 값은 (direct)/(none) 으로 정규화).
  cohort as (
    select
      u.id,
      coalesce(nullif(u.attr_source, ''),   '(direct)') as source,
      coalesce(nullif(u.attr_campaign, ''), '(none)')   as campaign
    from public.users u
    where u.created_at >= since
  ),
  -- 코호트 유저별 단계 도달 플래그 + 누적 결제액.
  prog as (
    select
      c.id,
      c.source,
      c.campaign,
      exists(select 1 from public.saju_profiles sp
               where sp.owner_id = c.id and sp.relation_type = 'self')         as onboarded,
      exists(select 1 from public.chat_sessions cs where cs.user_id = c.id)     as activated,
      exists(select 1 from public.credit_purchases p
               where p.user_id = c.id and p.status = 'paid')                    as paid,
      coalesce((select sum(p.amount) from public.credit_purchases p
                  where p.user_id = c.id and p.status = 'paid'), 0)             as revenue
    from cohort c
  ),
  -- 방문(익명 포함) — page_view 이벤트, 소스별 distinct 방문자.
  visits as (
    select
      coalesce(nullif(utm_source, ''), '(direct)') as source,
      count(distinct anon_id)                       as visitors,
      count(*)                                      as views
    from public.analytics_events
    where event_name = 'page_view' and created_at >= since
    group by 1
  ),
  src_prog as (
    select
      source,
      count(*)                          as signups,
      count(*) filter (where onboarded) as onboarded,
      count(*) filter (where activated) as activated,
      count(*) filter (where paid)      as paid,
      coalesce(sum(revenue), 0)         as revenue
    from prog
    group by source
  ),
  camp_prog as (
    select
      campaign,
      max(source)                       as source,
      count(*)                          as signups,
      count(*) filter (where onboarded) as onboarded,
      count(*) filter (where activated) as activated,
      count(*) filter (where paid)      as paid,
      coalesce(sum(revenue), 0)         as revenue
    from prog
    group by campaign
  ),
  daily as (
    select
      to_char(g::date, 'YYYY-MM-DD') as day,
      (select count(*) from public.users u
         where u.created_at::date = g::date)                                   as signups,
      (select count(*) from public.credit_purchases p
         where p.status = 'paid' and p.approved_at::date = g::date)            as paid,
      (select coalesce(sum(p.amount), 0) from public.credit_purchases p
         where p.status = 'paid' and p.approved_at::date = g::date)            as revenue
    from generate_series(since::date, now()::date, interval '1 day') g
  )
  select json_build_object(
    'range_days', d,
    'totals', json_build_object(
      'visitors',    (select coalesce(sum(visitors), 0) from visits),
      'views',       (select coalesce(sum(views), 0) from visits),
      'signups',     (select count(*) from prog),
      'ad_signups',  (select count(*) from prog where source <> '(direct)'),
      'onboarded',   (select count(*) filter (where onboarded) from prog),
      'activated',   (select count(*) filter (where activated) from prog),
      'paid',        (select count(*) filter (where paid) from prog),
      'revenue_krw', (select coalesce(sum(revenue), 0) from prog)
    ),
    'by_source', (
      select coalesce(json_agg(r order by r.revenue_krw desc, r.visitors desc), '[]'::json)
      from (
        select
          coalesce(sp.source, v.source)  as source,
          coalesce(v.visitors, 0)        as visitors,
          coalesce(sp.signups, 0)        as signups,
          coalesce(sp.onboarded, 0)      as onboarded,
          coalesce(sp.activated, 0)      as activated,
          coalesce(sp.paid, 0)           as paid,
          coalesce(sp.revenue, 0)        as revenue_krw
        from src_prog sp
        full outer join visits v on v.source = sp.source
      ) r
    ),
    'by_campaign', (
      select coalesce(json_agg(r order by r.revenue_krw desc, r.signups desc), '[]'::json)
      from (
        select
          campaign,
          source,
          signups,
          onboarded,
          activated,
          paid,
          revenue as revenue_krw
        from camp_prog
      ) r
    ),
    'daily', (
      select coalesce(json_agg(r order by r.day), '[]'::json)
      from (
        select day, signups, paid, revenue as revenue_krw from daily
      ) r
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_funnel(int) from public, anon, authenticated;
grant execute on function public.admin_funnel(int) to service_role;
