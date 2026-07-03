-- Migrazione: pannello Walt — revisione, sospensione, schedulazione, tag, festività
-- Esegui DOPO migration-classiche.sql

alter table public.stories
  add column if not exists review_status text not null default 'approved',
  add column if not exists suspended boolean not null default false,
  add column if not exists visible_from timestamptz,
  add column if not exists visible_until timestamptz,
  add column if not exists tags text[] not null default '{}',
  add column if not exists holiday_tag text,
  add column if not exists source_url text;

alter table public.stories
  drop constraint if exists stories_review_status_check;
alter table public.stories
  add constraint stories_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

-- estendo story_type per includere le storie stagionali/festività
alter table public.stories
  drop constraint if exists stories_story_type_check;
alter table public.stories
  add constraint stories_story_type_check
  check (story_type in ('original', 'classic', 'seasonal'));

-- indice per i filtri del pannello admin
create index if not exists idx_stories_admin_filter
  on public.stories (is_preset, story_type, review_status, suspended, mode, age);

create index if not exists idx_stories_holiday
  on public.stories (holiday_tag) where holiday_tag is not null;

-- Le 42 storie originali + le classiche già create restano "approved" e non sospese di default.
