-- ===========================================================================
-- Collection Tracker — photo storage setup
-- ===========================================================================
-- Run this once to enable the "📷 Photo" button (capture/upload item covers).
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run
-- Safe to run more than once.
-- ===========================================================================

-- A public bucket for cover images (public = anyone with the URL can view the
-- image, which is fine for covers; writing is restricted to you below).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = true;

-- Anyone can read images; only a logged-in user (you) can add/change/remove.
drop policy if exists "covers public read" on storage.objects;
drop policy if exists "covers auth insert" on storage.objects;
drop policy if exists "covers auth update" on storage.objects;
drop policy if exists "covers auth delete" on storage.objects;

create policy "covers public read" on storage.objects
  for select using (bucket_id = 'covers');

create policy "covers auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'covers');

create policy "covers auth update" on storage.objects
  for update to authenticated using (bucket_id = 'covers') with check (bucket_id = 'covers');

create policy "covers auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'covers');
