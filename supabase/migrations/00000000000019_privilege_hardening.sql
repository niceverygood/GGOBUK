-- Phase 0 P0 보안 강화 (2026-08-14)
--
-- 배경: RLS 정책이 "행 소유권"만 검사하고 **컬럼**을 제한하지 않는데,
-- Supabase 는 public 스키마 테이블에 anon/authenticated 기본 grant 를 준다.
-- 그 결과 로그인 사용자가 PostgREST 로 자기 행의 민감 컬럼을 직접 쓸 수 있었다.
--
-- ⚠️ 이 마이그레이션은 **권한을 축소**한다. 적용 전에 아래 preflight 를 실행해
--    끊기는 코드 경로가 없는지 확인하라. 적용 순서: preflight → 코드 배포 → 이 마이그레이션.
--
-- ─────────────────────────── PREFLIGHT (읽기 전용, 먼저 실행) ───────────────────────────
-- 1) 현재 grant 상태 확인 — authenticated 가 users 에 UPDATE/INSERT 를 갖는가?
--    select grantee, privilege_type, table_name
--      from information_schema.role_table_grants
--     where table_schema='public'
--       and grantee in ('anon','authenticated')
--       and table_name in ('users','usage_logs','interpretations','daily_fortunes')
--     order by table_name, grantee, privilege_type;
--
-- 2) 컬럼 단위 grant 가 이미 있는지
--    select grantee, table_name, column_name, privilege_type
--      from information_schema.column_privileges
--     where table_schema='public' and grantee in ('anon','authenticated')
--     order by table_name, column_name;
--
-- 3) 적용 여부 판단용 — 이 마이그레이션이 이미 돌았는가?
--    select has_table_privilege('authenticated','public.users','UPDATE') as still_broad_update;
--
-- ─────────────────────────── ROLLBACK ───────────────────────────
-- 이 파일은 권한만 바꾸므로 데이터 손실이 없다. 되돌리려면:
--    grant update, insert on public.users to authenticated;
--    grant insert, update, delete on public.usage_logs to authenticated;
-- (단, 되돌리면 아래 취약점이 다시 열린다. 코드 롤백이 먼저다.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) users — 컬럼 단위 권한으로 축소
--
--    취약점(확인됨): `users update self` 정책이 auth.uid() = id 만 검사하고 컬럼을
--    제한하지 않는다. 기본 table grant 와 결합하면 사용자가 다음을 직접 쓸 수 있다:
--      credit_balance(재화), is_admin(관리자 승격), is_pro, signup_bonus_granted,
--      bread_stamps / bread_reward_count(출석 보상 우회), ai_consent_at(동의 위조)
--
--    조치: UPDATE/INSERT 를 통째로 회수하고, 사용자가 스스로 바꿔도 되는 컬럼만
--    컬럼 단위로 다시 부여한다. 나머지는 server-only(admin client 또는 SECURITY DEFINER RPC).
-- ─────────────────────────────────────────────────────────────────────────────
revoke update on public.users from anon, authenticated;
revoke insert on public.users from anon, authenticated;

-- 사용자가 직접 수정해도 안전한 필드만.
--  · nickname     : 별명 변경
--  · push_enabled / push_token / push_time : 알림 설정 (/api/me/push)
-- ⚠️ credit_balance, is_admin, is_pro, pro_expires_at, signup_bonus_granted,
--    ai_consent_at, bread_*, attr_* 는 의도적으로 제외한다.
grant update (nickname, push_enabled, push_token, push_time)
  on public.users to authenticated;

-- SELECT 는 기존 정책(users select self)이 행을 제한하므로 유지한다.
-- INSERT 는 회수했다 — public.users 행 생성은 서버(콜백/부트스트랩)의 admin client 가 한다.
-- 사용자 INSERT 를 열어두면 신규 행에 credit_balance/is_admin 을 실어 만들 수 있다.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) usage_logs — 무료 사용량 초기화 방지
--
--    취약점(확인됨): `usage all own` 이 FOR ALL 이라 사용자가 자기 usage_logs 행을
--    UPDATE/DELETE 해 무료 채팅 한도를 무한 리셋할 수 있다.
--    조치: 사용자에게는 SELECT 만. 증감은 SECURITY DEFINER RPC 로만.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "usage all own" on public.usage_logs;
drop policy if exists "usage select own" on public.usage_logs;
create policy "usage select own" on public.usage_logs for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.usage_logs from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) increment_chat_usage — 호출자 검증 + KST 날짜 키
--
--    취약점 A(확인됨): SECURITY DEFINER 이면서 authenticated 에 EXECUTE 가 열려 있고
--      auth.uid() = p_user_id 검증이 없다 → 타인의 무료 채팅 한도를 소진시킬 수 있다(griefing).
--    취약점 B(확인됨): 날짜 키가 current_date(=DB 타임존, 보통 UTC)인데
--      호출부 src/app/api/chat/route.ts 는 KST(todayKstIso)로 조회한다 →
--      KST 00:00~09:00 사이의 사용량이 다른 날짜 행에 쌓여 카운터가 0으로 읽힌다
--      (= 무료 한도가 사실상 무제한). PRICING.md 의 "KST 자정 리셋" 약속과도 불일치.
--
--    ⚠️ 날짜 기준을 KST 로 바꾸면 기존 UTC 행과 키가 달라진다. 데이터 손실은 없고
--    (append-only 카운터) 전환일 하루만 카운트가 낙관적으로 보일 수 있다.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.increment_chat_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_service_role() or auth.uid() = p_user_id) then
    raise exception 'forbidden';
  end if;

  insert into public.usage_logs (user_id, date, chat_messages)
  values (p_user_id, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, date)
  do update set chat_messages = usage_logs.chat_messages + 1;
end;
$$;

revoke all on function public.increment_chat_usage(uuid) from public;
grant execute on function public.increment_chat_usage(uuid)
  to service_role, anon, authenticated;

create or replace function public.increment_interp_views(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_service_role() or auth.uid() = p_user_id) then
    raise exception 'forbidden';
  end if;

  insert into public.usage_logs (user_id, date, interpretations_viewed)
  values (p_user_id, (now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (user_id, date)
  do update set interpretations_viewed = usage_logs.interpretations_viewed + 1;
end;
$$;

revoke all on function public.increment_interp_views(uuid) from public;
grant execute on function public.increment_interp_views(uuid)
  to service_role, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) 서버 생성 결과물 — 사용자 직접 쓰기 차단 (paywall 무결성)
--
--    interpretations / daily_fortunes 는 서버가 과금 후 생성해 저장하는 결과다.
--    사용자 롤에 INSERT/UPDATE/DELETE 가 열려 있으면 결과를 직접 만들어
--    유료 생성을 우회하거나 남의 결과를 위조할 수 있다.
--    (쓰기는 전부 admin client 경로이므로 회수해도 앱 동작에 영향이 없다.)
-- ─────────────────────────────────────────────────────────────────────────────
revoke insert, update, delete on public.interpretations from anon, authenticated;
revoke insert, update, delete on public.daily_fortunes from anon, authenticated;

-- interpretations 의 기존 insert 정책은 더 이상 사용자 경로가 없으므로 정리한다.
-- (grant 회수로 이미 무력화됐지만, 정책이 남아 있으면 "쓰기가 가능하다"는 오해를 만든다.)
drop policy if exists "interp insert own" on public.interpretations;

notify pgrst, 'reload schema';
