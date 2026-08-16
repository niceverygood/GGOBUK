# 마이그레이션 적용 런북

> ⚠️ **이 문서 아래쪽의 브라우저 자동화 절차는 대체됐다.** 지금은 `scripts/db.mjs` 를 쓴다.
> 아래 절차는 CLI 를 못 쓰는 상황(토큰 없음 등)의 대비책으로만 남긴다.

## 표준 절차 (2026-08-16~)

```bash
cd /Users/seungsoohan/Projects/GGOBUK/kkobukjeom
export SUPABASE_PAT='sbp_...'
pnpm db:status
```

적용 전 **반드시 미리보기**부터 — 그 파일이 무엇을 하는지 보여준다.

```bash
cd /Users/seungsoohan/Projects/GGOBUK/kkobukjeom
pnpm db:apply <번호>
```

미리보기 결과에 따라 게이트가 다르다.

| 미리보기가 말하는 것 | 적용 방법 |
|---|---|
| 스키마 변경만 (테이블·컬럼·인덱스·RPC·권한) | `pnpm db:apply <번호> --yes` |
| **사용자 데이터를 변경한다** (UPDATE/DELETE 또는 🔴 승인 표시) | `--yes` 를 붙여도 **번호를 손으로 타이핑**해야 적용된다. 파이프·CI 에서는 아예 불가 |

데이터 변경 마이그레이션은 적용 전에 파일 상단 PREFLIGHT 쿼리를 `pnpm db:query` 로
돌려 **영향 범위를 실측**하고, 그 숫자를 사용자에게 보고한 뒤 진행한다.

적용이 끝나면 `db:apply` 가 `db:verify` 를 자동으로 이어 돌린다. 14건이 전부 통과해야 한다.

> **왜 타이핑인가** — 2026-08-16 에 안내 코드블록의 `--yes` 가 그대로 붙여넣어져
> 승인 대기 마이그레이션이 적용됐다. 플래그는 복사·붙여넣기로 전파되지만 타이핑은
> 전파되지 않는다. 상세는 `DECISIONS.md` D-14.

---

## (대비책) 브라우저 자동화 — Codex 프롬프트

> 프로덕션 Supabase 에 migration 18·20·21·19 를 적용한다.
> 아래 구분선 아래 프롬프트 **전문**을 `codex` 에 붙여넣으면 된다.
>
> ```bash
> cd /Users/seungsoohan/Projects/GGOBUK/kkobukjeom
> codex
> ```

---

# 꼬북점 프로덕션 마이그레이션 적용 — 브라우저 자동화

너는 이 작업의 **릴리스 엔지니어**다. 프로덕션 데이터베이스에 스키마 변경을 적용한다.
되돌리기 어려운 작업이므로 **한 번에 하나씩, 매번 검증하고, 이상하면 즉시 멈춘다.**

- 저장소: `/Users/seungsoohan/Projects/GGOBUK/kkobukjeom`
- Supabase 프로젝트 ref: `zaifbeulgqmhzeewkbtd`
- SQL Editor: `https://supabase.com/dashboard/project/zaifbeulgqmhzeewkbtd/sql/new`
- 앱 코드는 **이미 배포 완료**(커밋 `b2a5212`). 코드가 마이그레이션보다 앞서 있는 상태다.

## 0. 절대 규칙

1. **한 번에 마이그레이션 하나.** 여러 개를 한 에디터에 이어 붙이지 마라.
2. **매 단계마다 검증 쿼리를 실행하고 결과를 사용자에게 보고**한 뒤 다음으로 간다.
3. **예상과 다른 결과가 하나라도 나오면 즉시 멈추고 사용자에게 보고**한다. 추측으로 진행하지 마라.
4. `DROP TABLE`, `DELETE FROM`, `TRUNCATE` 를 **직접 입력하지 마라.** 마이그레이션 파일에 있는 SQL만 실행한다.
5. `.env.local` 값, service role key, 세션 쿠키, 토큰을 **화면에 출력하거나 파일에 쓰지 마라.**
6. 마이그레이션 파일을 **수정하지 마라.** 파일 내용을 그대로 복사해 실행만 한다.
7. 사용자의 Supabase 계정으로 로그인된 브라우저를 쓴다. **비밀번호를 대신 입력하지 마라** —
   로그인 화면이 뜨면 멈추고 사용자에게 직접 로그인해 달라고 요청한 뒤 대기한다.

## 1. 브라우저 준비

브라우저 자동화 도구가 있으면 그것을 쓴다. 없으면 Playwright 를 설치한다:

```bash
cd /Users/seungsoohan/Projects/GGOBUK/kkobukjeom
pnpm add -D playwright
pnpm exec playwright install chromium
```

⚠️ **로그인 세션 문제.** Supabase 대시보드는 로그인이 필요하다. 두 방법 중 하나를 쓴다:

- **(A) 권장** — `headless: false` 로 브라우저를 띄우고 **사용자가 직접 로그인**하게 한 뒤,
  `storageState` 를 임시 파일에 저장해 이후 단계에서 재사용한다.
  (임시 파일은 작업이 끝나면 **반드시 삭제**한다. 저장소에 커밋하지 마라.)
- **(B)** 사용자에게 이미 로그인된 Chrome 을 종료하게 한 뒤 `launchPersistentContext` 로
  실제 프로필을 재사용한다. Chrome 이 떠 있으면 프로필 잠금 때문에 실패한다.

먼저 SQL Editor URL 로 이동해 **로그인 상태인지 확인**하고, 아니면 위 절차를 안내한 뒤 대기하라.

## 2. 적용 순서 — 반드시 이 순서

| # | 파일 | 성격 | 왜 이 순서인가 |
|---|---|---|---|
| 1 | `supabase/migrations/00000000000018_bread_and_monthly.sql` | 테이블·컬럼 추가 | additive, 독립 |
| 2 | `supabase/migrations/00000000000020_representative_profile.sql` | 컬럼 추가 + 백필 + FK | additive. **백필이 FK보다 먼저** 돌도록 파일 안에 순서가 잡혀 있다 |
| 3 | `supabase/migrations/00000000000021_reports_and_entitlements.sql` | 테이블 + RPC | additive, 독립 |
| 4 | `supabase/migrations/00000000000019_privilege_hardening.sql` | **권한 축소** | 🔴 **반드시 마지막.** `users` INSERT/UPDATE 를 회수하므로 앱 코드가 admin client 로 쓰고 있어야 한다(이미 배포됨) |

## 3. 실행 절차 (각 마이그레이션마다 반복)

### 3-1. 사전 점검

먼저 아래를 SQL Editor 에서 실행하고 결과를 보고하라. **이미 적용된 상태면 그 마이그레이션은 건너뛴다.**

```sql
select
  to_regclass('public.bread_opens')       as m18_bread_opens,
  to_regclass('public.monthly_readings')  as m18_monthly_readings,
  to_regclass('public.reports')           as m21_reports,
  to_regclass('public.entitlements')      as m21_entitlements,
  exists(select 1 from information_schema.columns
         where table_schema='public' and table_name='users'
           and column_name='representative_profile_id')       as m20_rep_col,
  has_table_privilege('authenticated','public.users','UPDATE') as m19_still_open;
```

**기대값(적용 전)**: 앞의 4개 `null`, `m20_rep_col` = `false`, `m19_still_open` = `true`
→ 하나라도 다르면 **멈추고 보고**하라. 이미 일부 적용됐다는 뜻이다.

### 3-2. 파일 내용 읽기

```bash
cat supabase/migrations/<파일명>.sql
```

파일 **전문**을 SQL Editor 에 붙여넣는다. 주석도 그대로 둔다(preflight/rollback 정보가 들어 있다).

### 3-3. 실행 후 즉시 검증

아래 해당 마이그레이션의 검증 쿼리를 실행하고 결과를 보고한다.

**migration 18 검증**
```sql
select
  to_regclass('public.bread_opens')      as bread_opens,
  to_regclass('public.monthly_readings') as monthly_readings,
  exists(select 1 from information_schema.columns where table_name='users'
         and column_name='bread_stamps')                       as users_bread_stamps,
  exists(select 1 from information_schema.columns where table_name='daily_fortunes'
         and column_name='lucky_food')                         as daily_lucky_food,
  (select count(*) from pg_proc where proname='open_bread')     as open_bread_fn,
  (select pg_get_function_identity_arguments(oid) from pg_proc
    where proname='open_bread' limit 1)                         as open_bread_args;
```
기대: 앞 4개 non-null/true, `open_bread_fn` = 1,
**`open_bread_args` = `p_user_id uuid`** ← 인자가 이것 하나뿐이어야 한다.
인자가 더 있으면 **임의 재화 발행 취약점**이므로 즉시 멈추고 보고하라.

**migration 20 검증**
```sql
select
  (select count(*) from information_schema.columns
    where table_name='users'
      and column_name in ('representative_profile_id','leaf_balance','paid_chat_turns')) as users_cols_3,
  (select count(*) from information_schema.columns
    where table_name='saju_profiles'
      and column_name in ('deleted_at','identity_hash','calculation_version'))            as profile_cols_3,
  exists(select 1 from pg_constraint
         where conname='users_representative_owned_fk')                                   as ownership_fk,
  (select count(*) from public.users)                                                     as total_users,
  (select count(*) from public.users where representative_profile_id is not null)         as backfilled,
  (select count(*) from public.users u
     where u.representative_profile_id is null
       and exists(select 1 from public.saju_profiles p where p.owner_id = u.id))           as missing_backfill;
```
기대: `users_cols_3` = 3, `profile_cols_3` = 3, `ownership_fk` = true,
**`missing_backfill` = 0** ← 프로필이 있는데 대표가 안 잡힌 사용자가 0명이어야 한다.
0이 아니면 멈추고 보고하라.

**migration 21 검증**
```sql
select
  to_regclass('public.reports')     as reports,
  to_regclass('public.report_jobs') as report_jobs,
  to_regclass('public.entitlements') as entitlements,
  (select count(*) from pg_proc
    where proname in ('report_transition','entitlement_reserve',
                      'entitlement_consume','entitlement_release'))  as rpc_count;
```
기대: 앞 3개 non-null, `rpc_count` = 4.

**migration 19 검증** (🔴 가장 중요)
```sql
select
  has_table_privilege('authenticated','public.users','UPDATE')       as broad_update_열림,
  has_column_privilege('authenticated','public.users','nickname','UPDATE')       as can_nickname,
  has_column_privilege('authenticated','public.users','push_enabled','UPDATE')   as can_push,
  has_column_privilege('authenticated','public.users','credit_balance','UPDATE') as can_balance,
  has_column_privilege('authenticated','public.users','is_admin','UPDATE')       as can_admin,
  has_table_privilege('authenticated','public.usage_logs','UPDATE')  as usage_update,
  has_table_privilege('authenticated','public.interpretations','INSERT') as interp_insert;
```
기대:
- `broad_update_열림` = **false**
- `can_nickname` = **true**, `can_push` = **true**
- `can_balance` = **false**, `can_admin` = **false** ← 이게 핵심. true 면 권한상승이 그대로다
- `usage_update` = **false**, `interp_insert` = **false**

하나라도 기대와 다르면 **즉시 멈추고 보고**하라.

## 4. 전체 완료 후 최종 확인

### 4-1. DB 최종 상태
```sql
select
  (select count(*) from information_schema.tables
    where table_schema='public'
      and table_name in ('bread_opens','monthly_readings','reports','report_jobs','entitlements')) as new_tables_5,
  (select count(*) from pg_proc
    where proname in ('open_bread','report_transition','entitlement_reserve',
                      'entitlement_consume','entitlement_release'))                                as new_rpcs_5,
  has_table_privilege('authenticated','public.users','UPDATE')                                     as must_be_false;
```
기대: `new_tables_5` = 5, `new_rpcs_5` = 5, `must_be_false` = false.

### 4-2. 앱 동작 확인 (사용자에게 요청)

DB 검증이 통과하면 사용자에게 다음을 직접 확인해 달라고 요청하라.
자동화로 로그인 흐름을 대신 수행하지 마라.

1. `https://ggobuk.vercel.app` 카카오 로그인 → 홈 진입
2. 홈에서 **거북빵 굽기** → 오늘의 운세가 나오고 도장이 1개 찍히는지
3. 홈의 **이번 달 흐름** → 무료 3줄 요약이 생성되는지
4. **신규 가입이 되는지** (migration 19 가 `users` INSERT 를 회수했으므로 가장 중요)

## 5. 문제가 생겼을 때

- **적용 중 에러**: 에러 메시지 전문을 보고하고 멈춰라. 임의로 SQL 을 고쳐 재시도하지 마라.
- **19 적용 후 신규 가입 실패**: 가장 가능성 높은 원인은 `callback` 코드가 admin client 를 쓰지 않는 배포본인 경우다.
  각 마이그레이션 파일 상단 주석의 `ROLLBACK` 절에 되돌리는 SQL 이 있다. 사용자에게 보고하고 지시를 기다려라.
- 모든 마이그레이션은 `if not exists` / `create or replace` 라 **재실행해도 안전**하다(멱등).

## 6. 마무리

- 임시 `storageState` 파일을 삭제했는지 확인하라.
- `docs/parity-rebuild/STATUS.md` 의 승인 대기 항목 **A-1** 을 "적용 완료 (날짜)" 로 갱신하라.
- 최종 보고: 적용한 마이그레이션 목록, 각 검증 결과, 남은 이슈.
