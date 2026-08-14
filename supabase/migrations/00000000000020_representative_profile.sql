-- Phase 1 Foundation (2026-08-14)
--   1) 대표프로필 — users.representative_profile_id (소유권을 DB 가 강제)
--   2) saju_profiles — soft delete, 계산 버전, 중복 방지 identity hash
--   3) 꼬북잎(LEAF) 잔액 컬럼 (원장 v2 이전의 확장 단계)
--
-- 설계 노트
--  - `relation_type='self'` 를 "유일한 대표"로 쓰던 가정을 제거한다. DB 에는 원래 유일 제약이
--    없었고(check 는 허용값만 검사) 코드만 .maybeSingle() 로 가정하고 있었다.
--    이제 관계 유형(relation_type)과 대표 여부(representative_profile_id)를 분리한다.
--  - 대표프로필의 **소유권을 트리거 없이** 강제한다: saju_profiles(id, owner_id) 에 unique 를 걸고
--    users(representative_profile_id, id) → saju_profiles(id, owner_id) 복합 FK 를 건다.
--    즉 "내 프로필이 아닌 id" 는 DB 가 거부한다.
--
-- ─────────────────────────── PREFLIGHT (읽기 전용) ───────────────────────────
--  select count(*) from public.saju_profiles where relation_type = 'self';
--  select owner_id, count(*) c from public.saju_profiles
--    where relation_type='self' group by owner_id having count(*) > 1;   -- 다중 self 사용자
--  select count(*) from public.users where representative_profile_id is not null; -- 재실행 확인
--
-- ─────────────────────────── ROLLBACK ───────────────────────────
--  alter table public.users drop constraint if exists users_representative_owned_fk;
--  alter table public.users drop column if exists representative_profile_id;
--  alter table public.users drop column if exists leaf_balance;
--  alter table public.users drop column if exists paid_chat_turns;
--  drop index if exists saju_profiles_identity_uniq;
--  alter table public.saju_profiles drop column if exists identity_hash;
--  alter table public.saju_profiles drop column if exists calculation_version;
--  alter table public.saju_profiles drop column if exists deleted_at;
--  alter table public.saju_profiles drop constraint if exists saju_profiles_id_owner_key;
--  (데이터 손실 없음 — 전부 additive)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) saju_profiles 확장
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.saju_profiles
  add column if not exists deleted_at timestamptz;
alter table public.saju_profiles
  add column if not exists calculation_version text default 'v1' not null;

comment on column public.saju_profiles.deleted_at is
  'soft delete. null 이 아니면 목록/선택에서 제외하되 과거 유료 리포트의 참조는 유지된다.';
comment on column public.saju_profiles.calculation_version is
  '이 프로필을 계산한 사주 엔진 버전. 리포트 snapshot 과 함께 결과 재현에 쓴다.';

-- 동일 인물 중복 등록 방지 — 경합까지 DB 가 막는다.
-- 이름은 공백 제거 + 소문자로 정규화한다. 쌍둥이처럼 생년정보가 같고 이름이 다른 경우는 허용된다.
alter table public.saju_profiles
  add column if not exists identity_hash text
  generated always as (
    md5(
      owner_id::text || '|' ||
      lower(regexp_replace(coalesce(name, ''), '\s+', '', 'g')) || '|' ||
      birth_date::text || '|' ||
      coalesce(birth_time::text, 'unknown') || '|' ||
      is_lunar::text || '|' ||
      is_leap_month::text || '|' ||
      gender
    )
  ) stored;

-- 살아있는 프로필끼리만 유일. soft delete 된 행은 재등록을 막지 않는다.
create unique index if not exists saju_profiles_identity_uniq
  on public.saju_profiles (identity_hash)
  where deleted_at is null;

-- 복합 FK 의 참조 대상 (id 는 이미 PK 라 논리적으로 중복이지만 FK 에는 unique 가 필요하다)
alter table public.saju_profiles
  drop constraint if exists saju_profiles_id_owner_key;
alter table public.saju_profiles
  add constraint saju_profiles_id_owner_key unique (id, owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) users — 대표프로필 포인터 + 꼬북잎
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists representative_profile_id uuid;
alter table public.users
  add column if not exists leaf_balance int default 0 not null;
alter table public.users
  add column if not exists paid_chat_turns int default 0 not null;

comment on column public.users.representative_profile_id is
  '홈·오늘의운세·채팅의 기본 대상 프로필. 소유권은 users_representative_owned_fk 가 DB 레벨에서 강제한다.';
comment on column public.users.leaf_balance is
  '꼬북잎(LEAF) 잔액. 오늘의 운세 추가 이용·채팅 회차 충전용 소액 재화. 만료 없음.';
comment on column public.users.paid_chat_turns is
  '충전된 유료 채팅 회차. 무료 질문권을 먼저 소진한 뒤 사용한다. 만료 없음.';

-- ⚠️ 백필을 먼저 하고 FK 를 건다. 순서를 바꾸면 기존 행이 제약을 위반할 수 있다.
--    각 사용자의 self 프로필 중 가장 먼저 만든 것을 대표로 지정한다.
update public.users u
   set representative_profile_id = p.id
  from (
    select distinct on (owner_id) owner_id, id
      from public.saju_profiles
     where relation_type = 'self'
     order by owner_id, created_at asc
  ) p
 where p.owner_id = u.id
   and u.representative_profile_id is null;

-- self 가 하나도 없지만 프로필은 있는 사용자 → 가장 오래된 프로필을 대표로
update public.users u
   set representative_profile_id = p.id
  from (
    select distinct on (owner_id) owner_id, id
      from public.saju_profiles
     order by owner_id, created_at asc
  ) p
 where p.owner_id = u.id
   and u.representative_profile_id is null;

-- 소유권 강제: (representative_profile_id, id) 가 (saju_profiles.id, owner_id) 에 존재해야 한다.
-- 남의 프로필 id 를 넣으면 DB 가 거부한다. 프로필이 삭제되면 포인터는 null 이 된다.
alter table public.users
  drop constraint if exists users_representative_owned_fk;
alter table public.users
  add constraint users_representative_owned_fk
  foreign key (representative_profile_id, id)
  references public.saju_profiles (id, owner_id)
  on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) 권한 — 대표프로필/잔액은 사용자가 직접 못 쓴다
--    migration 19 가 users UPDATE 를 컬럼 단위로 축소했으므로 새 컬럼은 기본적으로 막혀 있다.
--    (grant 목록에 추가하지 않는 것만으로 충분 — 명시적으로 남겨 의도를 기록한다.)
-- ─────────────────────────────────────────────────────────────────────────────
-- representative_profile_id : PATCH /api/me/representative-profile 이 소유권 확인 후 admin 으로 쓴다
-- leaf_balance / paid_chat_turns : 원장 RPC 만 변경한다

notify pgrst, 'reload schema';
