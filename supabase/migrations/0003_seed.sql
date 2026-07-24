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

do $$
begin
  execute 'drop policy if exists "goat photos readable" on storage.objects';
  execute 'drop policy if exists "goat photos writable by authenticated" on storage.objects';

  execute $p$
    create policy "goat photos readable" on storage.objects
      for select using (bucket_id = 'goat-photos')
  $p$;

  execute $p$
    create policy "goat photos writable by authenticated" on storage.objects
      for all to authenticated
      using (bucket_id = 'goat-photos')
      with check (bucket_id = 'goat-photos')
  $p$;
end $$;

-- ---------------------------------------------------------------------------
-- Keep `profiles` in sync with auth.users so a newly invited partner shows up
-- as a payer option without any manual step.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill profiles for users that already exist.
insert into profiles (id, display_name, email)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)),
       u.email
from auth.users u
on conflict (id) do nothing;
