-- 2026-05-30 micro packages.
-- ₩900 mini (2알) + ₩2,900 entry (8알) replace the retired ₩4,900 starter as the
-- low-end purchasable lineup. 'starter' (and 'plus') stay in the CHECK so already
-- persisted credit_purchases rows remain valid; they are just no longer sold.
-- See src/lib/credits.ts (single source of truth) + PRICING.md §5.
alter table public.credit_purchases
  drop constraint if exists credit_purchases_package_id_check;
alter table public.credit_purchases
  add constraint credit_purchases_package_id_check
  check (package_id in ('firstdeal','mini','entry','starter','focus','plus','deep','master'));
