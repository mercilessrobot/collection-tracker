-- ===========================================================================
-- Collection Tracker — database schema
-- ===========================================================================
-- Paste this whole file into the Supabase dashboard:
--   Project -> SQL Editor -> New query -> paste -> Run
-- It is safe to run more than once.
-- ===========================================================================

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('game', 'movie', 'book')),
  title       text not null,
  creator     text,
  year        int,
  status      text not null default 'owned'
                check (status in ('owned', 'wishlist', 'in_progress', 'done')),
  rating      int check (rating between 0 and 5),
  notes       text,
  cover_url   text,
  identifier  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_user_type_idx on public.items (user_id, type);

-- Type-specific fields (added after the initial schema):
alter table public.items add column if not exists publisher text; -- game
alter table public.items add column if not exists platform text;  -- game
alter table public.items add column if not exists format text;    -- movie (DVD/VHS/Blu-Ray/4K Blu-Ray)

-- Row Level Security: every row is private to the user who created it.
alter table public.items enable row level security;

drop policy if exists "select own" on public.items;
drop policy if exists "insert own" on public.items;
drop policy if exists "update own" on public.items;
drop policy if exists "delete own" on public.items;

create policy "select own" on public.items
  for select using (auth.uid() = user_id);

create policy "insert own" on public.items
  for insert with check (auth.uid() = user_id);

create policy "update own" on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own" on public.items
  for delete using (auth.uid() = user_id);
