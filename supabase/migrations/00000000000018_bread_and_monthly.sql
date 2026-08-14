-- v3 콘텐츠 확장 (2026-08-11)
--   1) 행운의 거북빵 — 매일 무료 오픈 + 출석 도장 + 꼬북알 보상
--   2) 월별 사주풀이 — 무료 3줄 요약 / 유료 상세
--
-- 설계 노트
--  - 거북빵은 기존 daily_fortunes 를 "여는 의식"이다. 운세 본문은 daily_fortunes 에
--    그대로 두고, 이 테이블은 오픈 기록(도장·보상)만 관리한다.
--  - open_bread() 는 add_credits() 를 거치지 않고 직접 잔액을 올린다. 출시 전 블로커 #1
--    (service_role 이 PostgREST DB role 레이어에서 anon 으로 폴백)에 새 기능이 다시
--    묶이지 않도록, 마이그레이션 13 과 같은 self-guard 패턴만 사용한다.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) 거북빵 오픈 기록
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bread_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  -- KST 기준 날짜. 하루 1회 제한의 근거.
  date date not null,
  is_golden boolean default false not null,
  -- 이 오픈으로 찍힌 도장 번호 (1..7). 7이면 보상 지급 사이클 완료.
  stamp_no int not null,
  -- 이 오픈으로 지급된 꼬북알 (도장 완성 보상 + 황금 거북빵 보너스 합산).
  reward_credits int default 0 not null,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);
create index if not exists idx_bread_opens_user
  on public.bread_opens(user_id, date desc);

-- 출석 카운터 (users 에 부착 — 조회가 잦고 항상 1행이라 별도 테이블 불필요)
alter table public.users
  add column if not exists bread_stamps int default 0 not null;
alter table public.users
  add column if not exists bread_reward_month text;
alter table public.users
  add column if not exists bread_reward_count int default 0 not null;

comment on column public.users.bread_stamps is
  '현재 사이클의 출석 도장 수 (0..6). 7개째에 보상 지급 후 0으로 리셋. 결석해도 초기화되지 않음.';
comment on column public.users.bread_reward_month is
  '거북빵 보상을 마지막으로 받은 달 (KST YYYY-MM). 월 상한 계산용.';
comment on column public.users.bread_reward_count is
  '해당 달에 거북빵으로 받은 꼬북알 누계. BREAD_MONTHLY_REWARD_CAP 과 비교.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) 월별 사주풀이
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.monthly_readings (
  id uuid primary key default gen_random_uuid(),
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  -- KST 기준 'YYYY-MM'
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  -- summary = 무료 3줄, detail = 유료 상세
  tier text not null check (tier in ('summary', 'detail')),
  content text not null,
  model text,
  tokens_used int,
  generated_at timestamptz default now() not null,
  unique(saju_id, year_month, tier)
);
create index if not exists idx_monthly_readings_saju
  on public.monthly_readings(saju_id, year_month desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) RLS — 최소권한
--
--    ⚠️ 두 테이블 모두 **서버가 생성하고 과금하는 결과**다. 사용자에게 쓰기를 열면:
--      - bread_opens: 도장·보상 기록을 위조해 꼬북알을 발행할 수 있다
--      - monthly_readings: tier='detail' 행을 직접 INSERT 해 유료 풀이 페이월을 우회한다
--    따라서 사용자에게는 **본인 소유 SELECT 만** 허용하고, 쓰기는 전부 server-only
--    (open_bread RPC 또는 admin client)로 제한한다.
--    `for all` 정책을 쓰지 않는 이유이며, 이는 interpretations 의 UPDATE 정책 부재
--    문제와는 반대 방향의 결정이다(그쪽은 admin client 로만 쓰기 때문에 안전).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.bread_opens enable row level security;
alter table public.monthly_readings enable row level security;

drop policy if exists "bread opens all own" on public.bread_opens;
drop policy if exists "bread opens select own" on public.bread_opens;
create policy "bread opens select own" on public.bread_opens for select
  using (auth.uid() = user_id);

drop policy if exists "monthly readings all own" on public.monthly_readings;
drop policy if exists "monthly readings select own" on public.monthly_readings;
create policy "monthly readings select own" on public.monthly_readings for select
  using (
    exists (
      select 1 from public.saju_profiles sp
      where sp.id = saju_id and sp.owner_id = auth.uid()
    )
  );

-- 사용자 롤의 직접 쓰기 차단 (RLS 정책 부재 + grant 회수 이중 방어)
revoke insert, update, delete on public.bread_opens from anon, authenticated;
revoke insert, update, delete on public.monthly_readings from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) open_bread() — 하루 1회 오픈 + 도장 + 보상을 한 트랜잭션으로 처리
--
--    반환 JSON:
--      { opened, already_opened, is_golden, stamp_no, stamps,
--        reward_credits, balance, monthly_reward_count }
--
--    멱등성: unique(user_id, date) 로 하루 1회. 이미 열었으면 already_opened=true 로
--    현재 상태만 돌려주고 아무것도 변경하지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ 보안: 경제 파라미터를 함수 인자로 받지 않는다.
--    인자로 받으면 EXECUTE 권한을 가진 사용자가
--    open_bread(myId, 1, 999, 999999, 1, 999) 로 임의 재화를 발행할 수 있다.
--    도장수·보상량·월상한·확률·보너스는 전부 함수 내부 상수로 고정한다.
--    값을 바꾸려면 새 마이그레이션으로 이 함수를 replace 한다
--    (src/lib/credits.ts 의 BREAD 상수는 UI 표시 전용이며 권한이 없다).
create or replace function public.open_bread(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 경제 파라미터 (서버 소유, 호출자가 바꿀 수 없음)
  c_stamps_per_reward  constant int     := 7;
  c_credits_per_reward constant int     := 1;
  c_monthly_cap        constant int     := 4;
  c_golden_chance      constant numeric := 0.07;
  c_golden_bonus       constant int     := 1;

  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_month text := to_char((now() at time zone 'Asia/Seoul'), 'YYYY-MM');
  v_existing public.bread_opens%rowtype;
  v_stamps int;
  v_reward_month text;
  v_reward_count int;
  v_balance int;
  v_is_golden boolean := false;
  v_reward int := 0;
  v_stamp_no int;
begin
  -- 본인 요청이거나 service_role 일 때만 (마이그레이션 13 과 동일한 self-guard)
  if not (public.is_service_role() or auth.uid() = p_user_id) then
    raise exception 'forbidden';
  end if;

  select * into v_existing
  from public.bread_opens
  where user_id = p_user_id and date = v_today;

  if found then
    select bread_stamps, coalesce(credit_balance, 0), bread_reward_month, bread_reward_count
      into v_stamps, v_balance, v_reward_month, v_reward_count
      from public.users where id = p_user_id;
    return jsonb_build_object(
      'opened', true,
      'already_opened', true,
      'is_golden', v_existing.is_golden,
      'stamp_no', v_existing.stamp_no,
      'stamps', v_stamps,
      'reward_credits', v_existing.reward_credits,
      'balance', v_balance,
      'monthly_reward_count',
        case when v_reward_month = v_month then v_reward_count else 0 end
    );
  end if;

  -- 사용자 행 잠금 (동시 오픈 요청 방지)
  select bread_stamps, coalesce(credit_balance, 0), bread_reward_month, bread_reward_count
    into v_stamps, v_balance, v_reward_month, v_reward_count
    from public.users where id = p_user_id for update;

  if v_stamps is null then
    raise exception 'user not found';
  end if;

  -- 달이 바뀌었으면 월 보상 카운터 리셋
  if v_reward_month is distinct from v_month then
    v_reward_month := v_month;
    v_reward_count := 0;
  end if;

  -- 도장 1개 적립 (결석해도 리셋되지 않는 누적 방식)
  v_stamp_no := v_stamps + 1;
  v_is_golden := random() < c_golden_chance;

  -- 도장 사이클 완성 → 보상
  if v_stamp_no >= c_stamps_per_reward then
    if v_reward_count < c_monthly_cap then
      v_reward := least(c_credits_per_reward, c_monthly_cap - v_reward_count);
    end if;
    v_stamps := 0;
  else
    v_stamps := v_stamp_no;
  end if;

  -- 황금 거북빵 보너스 (월 상한 공유)
  if v_is_golden and (v_reward_count + v_reward) < c_monthly_cap then
    v_reward := v_reward + least(
      c_golden_bonus,
      c_monthly_cap - v_reward_count - v_reward
    );
  end if;

  insert into public.bread_opens (user_id, date, is_golden, stamp_no, reward_credits)
  values (p_user_id, v_today, v_is_golden, v_stamp_no, v_reward);

  if v_reward > 0 then
    v_balance := v_balance + v_reward;
    v_reward_count := v_reward_count + v_reward;

    insert into public.credit_transactions
      (user_id, kind, amount, balance_after, reason, reference_id)
    values
      (p_user_id, 'bonus', v_reward, v_balance,
       case when v_is_golden then '황금 거북빵 보상' else '거북빵 출석 보상' end,
       v_today::text);
  end if;

  update public.users
     set bread_stamps = v_stamps,
         bread_reward_month = v_reward_month,
         bread_reward_count = v_reward_count,
         credit_balance = v_balance
   where id = p_user_id;

  return jsonb_build_object(
    'opened', true,
    'already_opened', false,
    'is_golden', v_is_golden,
    'stamp_no', v_stamp_no,
    'stamps', v_stamps,
    'reward_credits', v_reward,
    'balance', v_balance,
    'monthly_reward_count', v_reward_count
  );
end;
$$;

-- 함수 내부 self-guard(auth.uid() = p_user_id or is_service_role())가 실제 권한을 판정한다.
-- 경제 파라미터가 상수로 고정됐으므로 호출자가 발행량을 조작할 수 없다.
revoke all on function public.open_bread(uuid) from public;
grant execute on function public.open_bread(uuid) to service_role, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) daily_fortunes 에 행운의 음식 추가 (거북빵 콘텐츠용)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.daily_fortunes
  add column if not exists lucky_food text;

notify pgrst, 'reload schema';
