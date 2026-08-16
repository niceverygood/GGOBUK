-- 프로필 중복 정리 + identity unique 전환 (2026-08-14)
--
-- 🔴 **이 마이그레이션은 사용자 데이터를 변경한다. 적용 전 승인 필수** (마스터 명세 §19).
--    다른 마이그레이션(18~21)은 순수 스키마 변경이라 자동 적용했지만, 이건 다르다.
--
-- ── 왜 필요한가 ────────────────────────────────────────────────────────────────
-- migration 20 은 원래 `saju_profiles_identity_uniq` UNIQUE 인덱스를 포함했는데,
-- 2026-08-14 프로덕션 적용에서 23505 로 실패했다. **이미 중복 프로필이 존재**한다.
--
-- 적용 시점 실측 (2026-08-14):
--   전체 프로필 158행 / 그중 중복 17행 / 중복 그룹 11개 (그룹당 2~4행)
--   대부분 수십 초~수 분 내 연속 생성 → select-then-insert 경합으로 인한 이중 제출
--
-- 중복 행에 붙은 데이터 (삭제 영향 실측):
--   interpretations   0건   ← 유료 풀이는 **하나도 없다**
--   daily_fortunes    2건
--   chat_sessions     0건
--   relations         1건
-- 보존 대상(각 그룹 최초 생성 행)에 붙은 데이터:
--   interpretations   6건 (=전체)
--   daily_fortunes  118건
--
-- → 즉 "최초 행을 남기고 나머지를 정리" 하면 **유료 산출물 손실이 0** 이다.
--
-- ── 왜 soft delete 인가 ───────────────────────────────────────────────────────
-- §2.1 "운영 데이터의 hard delete 보다 soft delete 와 보존 정책을 우선한다."
-- `deleted_at` 만 세우므로 되돌릴 수 있고, 중복 행에 붙은 daily_fortunes·relations 는
-- 그대로 남는다(참조 무결성 유지). 앱은 `deleted_at is null` 로 필터링한다.
--
-- ─────────────────────────── PREFLIGHT (읽기 전용, 반드시 먼저) ───────────────
--  -- 1) 지금 중복이 몇 건인가
--  with h as (
--    select id, owner_id, created_at, identity_hash,
--           row_number() over (partition by identity_hash order by created_at asc) as rn
--      from public.saju_profiles where deleted_at is null)
--  select count(*) filter (where rn > 1) as will_soft_delete,
--         count(*) filter (where rn = 1) as will_keep
--    from h;
--
--  -- 2) 정리 대상에 유료 풀이가 붙어 있는가 (0 이어야 안전)
--  with h as (
--    select id, row_number() over (partition by identity_hash order by created_at asc) as rn
--      from public.saju_profiles where deleted_at is null)
--  select count(*) as paid_reports_at_risk
--    from public.interpretations
--   where saju_id in (select id from h where rn > 1);
--
--  -- 3) 대표프로필이 정리 대상을 가리키는가 (아래 4단계가 재지정한다)
--  with h as (
--    select id, row_number() over (partition by identity_hash order by created_at asc) as rn
--      from public.saju_profiles where deleted_at is null)
--  select count(*) as reps_pointing_at_dupes
--    from public.users
--   where representative_profile_id in (select id from h where rn > 1);
--
-- ─────────────────────────── ROLLBACK ───────────────────────────
--  drop index if exists saju_profiles_identity_uniq;
--  update public.saju_profiles
--     set deleted_at = null
--   where deleted_at is not null
--     and deleted_reason = 'dedupe_2026_08_14';
--  (대표프로필 재지정은 되돌리지 않는다 — 어차피 유효한 본인 프로필을 가리킨다)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) 정리 사유를 남길 컬럼 (감사 추적)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.saju_profiles
  add column if not exists deleted_reason text;

comment on column public.saju_profiles.deleted_reason is
  'soft delete 사유. 운영 정리 작업을 나중에 식별·되돌리기 위한 감사 흔적.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) 중복 soft delete — 각 그룹의 **최초 생성 행만 남긴다**
--    멱등: 이미 정리된 행은 deleted_at 이 not null 이라 후보에서 빠진다.
-- ─────────────────────────────────────────────────────────────────────────────
with ranked as (
  select id,
         row_number() over (
           partition by identity_hash order by created_at asc, id asc
         ) as rn
    from public.saju_profiles
   where deleted_at is null
)
update public.saju_profiles p
   set deleted_at = now(),
       deleted_reason = 'dedupe_2026_08_14'
  from ranked r
 where p.id = r.id
   and r.rn > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) 정리된 프로필을 가리키던 대표프로필을 살아있는 동일 인물 행으로 옮긴다
--    (그냥 null 로 두면 사용자가 홈에서 대표 선택을 다시 해야 한다 — 불필요한 마찰)
-- ─────────────────────────────────────────────────────────────────────────────
update public.users u
   set representative_profile_id = alive.id
  from public.saju_profiles dead
  join public.saju_profiles alive
    on alive.identity_hash = dead.identity_hash
   and alive.owner_id = dead.owner_id
   and alive.deleted_at is null
 where u.representative_profile_id = dead.id
   and dead.deleted_at is not null;

-- 그래도 남으면(동일 인물 생존 행이 없는 경우) null 로 — 홈에서 다시 고르게 한다.
update public.users u
   set representative_profile_id = null
  from public.saju_profiles dead
 where u.representative_profile_id = dead.id
   and dead.deleted_at is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) 이제 UNIQUE 로 전환 — 앞으로의 경합을 DB 가 막는다
--    (migration 20 의 일반 인덱스를 대체)
-- ─────────────────────────────────────────────────────────────────────────────
drop index if exists saju_profiles_identity_idx;

create unique index if not exists saju_profiles_identity_uniq
  on public.saju_profiles (identity_hash)
  where deleted_at is null;

notify pgrst, 'reload schema';
