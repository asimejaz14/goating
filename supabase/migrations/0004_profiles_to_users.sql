-- ============================================================================
-- Goat Farm Portal — 0004 fix: repoint foreign keys from `profiles` to `users`
--
-- If this project's migrations were run once before the switch to self-issued
-- auth (0001–0003 used to create a `profiles` table mirroring auth.users) and
-- then run again afterwards, the database ends up in a mixed state: a fresh
-- `users` table exists, but `goats`, `crossings`, `expenses` and the rest
-- still point at the old `profiles` table. That happens because
-- `create table if not exists` never alters a table that's already there —
-- it created `users` (which didn't exist yet) but silently skipped `goats`
-- (which did), leaving its foreign key exactly where it was.
--
-- This migration is safe to run whether or not you hit that — every
-- statement is a no-op if there's nothing to fix.
-- ============================================================================

alter table goats drop constraint if exists goats_created_by_fkey;
alter table goats
  add constraint goats_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

alter table crossings drop constraint if exists crossings_created_by_fkey;
alter table crossings
  add constraint crossings_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

alter table vaccinations drop constraint if exists vaccinations_created_by_fkey;
alter table vaccinations
  add constraint vaccinations_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

alter table weights drop constraint if exists weights_created_by_fkey;
alter table weights
  add constraint weights_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

alter table health_records drop constraint if exists health_records_created_by_fkey;
alter table health_records
  add constraint health_records_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

alter table expenses drop constraint if exists expenses_paid_by_fkey;
alter table expenses
  add constraint expenses_paid_by_fkey
  foreign key (paid_by) references users (id) on delete restrict;

alter table expenses drop constraint if exists expenses_created_by_fkey;
alter table expenses
  add constraint expenses_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

alter table settlements drop constraint if exists settlements_from_user_fkey;
alter table settlements
  add constraint settlements_from_user_fkey
  foreign key (from_user) references users (id) on delete restrict;

alter table settlements drop constraint if exists settlements_to_user_fkey;
alter table settlements
  add constraint settlements_to_user_fkey
  foreign key (to_user) references users (id) on delete restrict;

alter table settlements drop constraint if exists settlements_created_by_fkey;
alter table settlements
  add constraint settlements_created_by_fkey
  foreign key (created_by) references users (id) on delete set null;

-- Old installs also carried a trigger that kept `profiles` in sync with
-- auth.users on signup — the self-issued auth flow doesn't use that anymore.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- Nothing above references `profiles` anymore, so it can go. If this errors
-- because something else still points at it, stop here and say what — don't
-- rerun with cascade.
drop table if exists profiles;
