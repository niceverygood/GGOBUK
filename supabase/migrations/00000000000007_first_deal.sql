-- First-purchase welcome deal (가입 24시간 한정 1,900원 특가)
--
-- 1) credit_purchases.package_id accepts 'firstdeal'
-- 2) first_deal_status(uuid) RPC — server-side eligibility check
--    eligible = signed up within 24h AND no prior PAID firstdeal purchase

alter table public.credit_purchases
  drop constraint if exists credit_purchases_package_id_check;
alter table public.credit_purchases
  add constraint credit_purchases_package_id_check
  check (package_id in ('firstdeal','starter','focus','plus','deep','master'));

create or replace function public.first_deal_status(p_user_id uuid)
returns json as $$
declare
  v_created timestamptz;
  v_expires timestamptz;
  v_purchased int;
  v_eligible boolean;
begin
  select created_at into v_created from public.users where id = p_user_id;
  if v_created is null then
    return json_build_object('eligible', false, 'reason', 'user_not_found');
  end if;

  v_expires := v_created + interval '24 hours';

  select count(*) into v_purchased
  from public.credit_purchases
  where user_id = p_user_id
    and package_id = 'firstdeal'
    and status = 'paid';

  v_eligible := (now() < v_expires) and (v_purchased = 0);

  return json_build_object(
    'eligible', v_eligible,
    'already_purchased', v_purchased > 0,
    'signed_up_at', v_created,
    'expires_at', v_expires,
    'now', now()
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.first_deal_status(uuid) from public, anon, authenticated;
grant execute on function public.first_deal_status(uuid) to service_role;
