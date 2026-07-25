-- ============================================================================
-- Goat Farm Portal — 0003 seed data and storage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Breeds. Codes are the uppercase initials used in tag numbers (BGF-MC-01).
-- Add more here later; each breed keeps its own counter.
-- ---------------------------------------------------------------------------
insert into breeds (name, code, description) values
  ('Makhi Cheeni', 'MC', 'Primary herd breed.'),
  ('Teddy',        'TD', null),
  ('Rajan Puri',   'RP', null)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Storage bucket for goat photos (photos are optional — the UI falls back to
-- a placeholder). Private bucket; the app serves signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('goat-photos', 'goat-photos', true)
on conflict (id) do nothing;

-- Uploads go straight from the browser to Storage using the public anon key
-- — there is no Supabase Auth session anymore for a policy to key off, so
-- this bucket is writable by anyone holding that key. That's an acceptable
-- trade for a two-person farm app; every other table stays behind the API's
-- own login. Route uploads through the backend instead if that ever changes.
do $$
begin
  execute 'drop policy if exists "goat photos readable" on storage.objects';
  execute 'drop policy if exists "goat photos writable by authenticated" on storage.objects';
  execute 'drop policy if exists "goat photos writable" on storage.objects';

  execute $p$
    create policy "goat photos readable" on storage.objects
      for select using (bucket_id = 'goat-photos')
  $p$;

  execute $p$
    create policy "goat photos writable" on storage.objects
      for all to anon, authenticated
      using (bucket_id = 'goat-photos')
      with check (bucket_id = 'goat-photos')
  $p$;
end $$;

-- ---------------------------------------------------------------------------
-- Portal users. There is no signup screen — add a partner by adding a row
-- here and re-running this file (it upserts by email, so it is safe to run
-- again after editing). `crypt(..., gen_salt('bf'))` produces a standard
-- bcrypt hash, the same format the API's own `bcrypt`-based verification
-- checks against.
--
-- EDIT THE ROWS BELOW before running this file for the first time: swap in
-- your friend's real email, and pick real passwords — whatever you leave
-- here is what you'll type in at /login.
-- ---------------------------------------------------------------------------
insert into users (email, display_name, password_hash) values
  ('asim.ejaz14@gmail.com', 'Asim',   crypt('ChangeThisPassword1!', gen_salt('bf'))),
  ('friend@example.com',    'Friend', crypt('ChangeThisPassword2!', gen_salt('bf')))
on conflict (email) do update
  set display_name  = excluded.display_name,
      password_hash = excluded.password_hash;
