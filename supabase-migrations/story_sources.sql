create table if not exists public.story_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  label text,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.story_sources enable row level security;

-- Solo servizio/admin può leggere e scrivere (le server functions usano già
-- assertAdmin lato applicativo, qui blocchiamo comunque l'accesso diretto).
create policy "service role only" on public.story_sources
  for all using (auth.role() = 'service_role');
