-- Tabella fonti per la ricerca automatica giornaliera di fiabe classiche.
-- (Sostituisce supabase-migrations/story_sources.sql, che aveva una policy
-- RLS troppo restrittiva: solo service_role, mai gli admin da dashboard.)
create table if not exists public.story_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  label text,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.story_sources enable row level security;

drop policy if exists "service role only" on public.story_sources;
drop policy if exists "admin can manage sources" on public.story_sources;

create policy "admin can manage sources" on public.story_sources
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
