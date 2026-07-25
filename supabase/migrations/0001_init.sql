-- ============================================================================
-- Goat Farm Portal — 0001 initial schema
-- Run this first in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fast ILIKE search on tag/name

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type goat_sex as enum ('male', 'female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goat_status as enum ('active', 'sold', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type acquisition_type as enum ('bred', 'purchased');
exception when duplicate_object then null; end $$;

do $$ begin
  create type crossing_status as enum ('pregnant', 'kidded', 'aborted', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type health_record_type as enum ('illness', 'treatment', 'deworming', 'checkup');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- users — a normal application table. There is no signup flow: partners are
-- added by inserting a row (see 0003_seed.sql) and the API mints its own
-- session tokens against `password_hash` — Supabase Auth is not involved.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null unique,
  display_name  text        not null,
  password_hash text        not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- breeds — seeded reference data; `next_seq` drives per-breed tag numbering
-- ---------------------------------------------------------------------------
create table if not exists breeds (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null unique,
  code        text    not null unique,          -- uppercase initials, e.g. MC
  next_seq    integer not null default 1,       -- next number for BGF-<code>-NN
  description text,
  created_at  timestamptz not null default now(),
  constraint breeds_code_uppercase check (code = upper(code)),
  constraint breeds_next_seq_positive check (next_seq >= 1)
);

-- ---------------------------------------------------------------------------
-- goats
-- ---------------------------------------------------------------------------
create table if not exists goats (
  id               uuid primary key default gen_random_uuid(),
  tag_number       text not null unique,        -- BGF-MC-01, auto-generated
  name             text,
  breed_id         uuid not null references breeds (id) on delete restrict,
  sex              goat_sex not null,
  date_of_birth    date,                        -- manually entered

  acquisition_type acquisition_type not null default 'bred',
  purchase_date    date,
  purchase_price   numeric(12, 2),
  purchased_from   text,

  status           goat_status not null default 'active',
  expired_on       date,
  death_cause      text,

  -- pedigree links, set via "link parents"
  dam_id           uuid references goats (id) on delete set null,
  sire_id          uuid references goats (id) on delete set null,
  crossing_id      uuid,                        -- FK added after `crossings` exists

  color            text,
  photo_url        text,                        -- null => placeholder image in UI
  notes            text,

  created_by       uuid references users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint goats_not_own_parent check (id <> dam_id and id <> sire_id),
  constraint goats_purchase_price_positive check (purchase_price is null or purchase_price >= 0)
);

-- ---------------------------------------------------------------------------
-- crossings — which doe was crossed with which buck, on what date
-- ---------------------------------------------------------------------------
create table if not exists crossings (
  id                    uuid primary key default gen_random_uuid(),
  dam_id                uuid not null references goats (id) on delete cascade,
  sire_id               uuid references goats (id) on delete set null,
  crossing_date         date not null,
  expected_kidding_date date not null,          -- crossing_date + gestation days
  actual_kidding_date   date,                   -- manual; may differ from expected
  number_of_kids        integer,
  status                crossing_status not null default 'pregnant',
  notes                 text,
  created_by            uuid references users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint crossings_kids_non_negative check (number_of_kids is null or number_of_kids >= 0),
  constraint crossings_distinct_parents check (sire_id is null or sire_id <> dam_id)
);

-- close the circular reference: a kid points back at the crossing that produced it
alter table goats
  drop constraint if exists goats_crossing_id_fkey;
alter table goats
  add constraint goats_crossing_id_fkey
  foreign key (crossing_id) references crossings (id) on delete set null;

-- ---------------------------------------------------------------------------
-- vaccinations — purely a manual historical log (no due/next dates by design)
-- ---------------------------------------------------------------------------
create table if not exists vaccinations (
  id               uuid primary key default gen_random_uuid(),
  goat_id          uuid not null references goats (id) on delete cascade,
  vaccine_name     text not null,
  date_administered date not null,
  dose             text,
  notes            text,
  created_by       uuid references users (id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- weights
-- ---------------------------------------------------------------------------
create table if not exists weights (
  id          uuid primary key default gen_random_uuid(),
  goat_id     uuid not null references goats (id) on delete cascade,
  weight_kg   numeric(6, 2) not null,
  measured_on date not null,
  notes       text,
  created_by  uuid references users (id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint weights_positive check (weight_kg > 0)
);

-- ---------------------------------------------------------------------------
-- health_records
-- ---------------------------------------------------------------------------
create table if not exists health_records (
  id          uuid primary key default gen_random_uuid(),
  goat_id     uuid not null references goats (id) on delete cascade,
  record_date date not null,
  type        health_record_type not null,
  description text not null,
  medication  text,
  notes       text,
  created_by  uuid references users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- expenses — split 50/50 between the two partners
-- ---------------------------------------------------------------------------
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  expense_date date           not null,
  name         text           not null,
  amount       numeric(12, 2) not null,
  paid_by      uuid           not null references users (id) on delete restrict,
  goat_id      uuid references goats (id) on delete set null,
  category     text,
  notes        text,
  created_by   uuid references users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint expenses_amount_positive check (amount > 0)
);

-- ---------------------------------------------------------------------------
-- settlements — "I paid you back" records that drive the balance to zero
-- ---------------------------------------------------------------------------
create table if not exists settlements (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid           not null references users (id) on delete restrict,
  to_user    uuid           not null references users (id) on delete restrict,
  amount     numeric(12, 2) not null,
  settled_on date           not null default current_date,
  note       text,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint settlements_amount_positive check (amount > 0),
  constraint settlements_distinct_users check (from_user <> to_user)
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists goats_set_updated_at on goats;
create trigger goats_set_updated_at
  before update on goats
  for each row execute function set_updated_at();

drop trigger if exists crossings_set_updated_at on crossings;
create trigger crossings_set_updated_at
  before update on crossings
  for each row execute function set_updated_at();

drop trigger if exists expenses_set_updated_at on expenses;
create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function set_updated_at();
