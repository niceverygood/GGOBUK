-- Allow the same (saju_id, category) to have one interpretation per persona.
-- Existing rows default to 'dosa' which preserves backward compatibility — that
-- was the only style produced by the old SYSTEM prompt.

alter table public.interpretations
  add column if not exists persona text default 'dosa' not null;

-- Constrain to known persona keys.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'interpretations_persona_check'
  ) then
    alter table public.interpretations
      add constraint interpretations_persona_check
      check (persona in ('kkobuk','dosa','mudang','bosal'));
  end if;
end $$;

-- Replace (saju_id, category) unique with (saju_id, category, persona).
alter table public.interpretations
  drop constraint if exists interpretations_saju_id_category_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'interpretations_saju_id_category_persona_key'
  ) then
    alter table public.interpretations
      add constraint interpretations_saju_id_category_persona_key
      unique (saju_id, category, persona);
  end if;
end $$;

create index if not exists idx_interpretations_saju_persona
  on public.interpretations(saju_id, persona);
