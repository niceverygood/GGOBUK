-- Cache generated interpretation webtoon images.

create table if not exists public.interpretation_comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  saju_id uuid references public.saju_profiles(id) on delete cascade not null,
  category text not null
    check (category in ('overview','ohaeng','ilju','strength','weakness',
                        'personality','career','wealth','love','family',
                        'friends','direction')),
  persona text not null default 'dosa'
    check (persona in ('kkobuk','dosa','mudang','bosal')),
  content_hash text not null,
  image_url text not null,
  title text not null,
  model text,
  format text default 'png' not null,
  prompt_version text default 'comic-v1' not null,
  generated_at timestamptz default now() not null,
  unique(saju_id, category, persona, content_hash, prompt_version)
);

create index if not exists idx_interpretation_comics_user
  on public.interpretation_comics(user_id, generated_at desc);

alter table public.interpretation_comics enable row level security;

drop policy if exists "interpretation comics select own" on public.interpretation_comics;
create policy "interpretation comics select own"
  on public.interpretation_comics for select
  using (auth.uid() = user_id);

drop policy if exists "interpretation comics insert own" on public.interpretation_comics;
create policy "interpretation comics insert own"
  on public.interpretation_comics for insert
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-comics',
  'generated-comics',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "generated comics public read" on storage.objects;
create policy "generated comics public read"
  on storage.objects for select
  using (bucket_id = 'generated-comics');
