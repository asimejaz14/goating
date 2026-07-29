-- ============================================================================
-- Goat Farm Portal — 0002 indexes, helper functions and row-level security
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Indexes — chosen to serve the filter/sort sets exposed by the API
-- ---------------------------------------------------------------------------

-- goats: status is the default filter, so it leads most queries
create index if not exists goats_status_idx            on goats (status);
create index if not exists goats_breed_id_idx          on goats (breed_id);
create index if not exists goats_sex_idx               on goats (sex);
create index if not exists goats_acquisition_type_idx  on goats (acquisition_type);
create index if not exists goats_dam_id_idx            on goats (dam_id);
create index if not exists goats_sire_id_idx           on goats (sire_id);
create index if not exists goats_crossing_id_idx       on goats (crossing_id);
create index if not exists goats_date_of_birth_idx     on goats (date_of_birth);
create index if not exists goats_created_at_idx        on goats (created_at desc);
-- fast ILIKE '%term%' search over tag number and name
create index if not exists goats_tag_number_trgm_idx   on goats using gin (tag_number gin_trgm_ops);
create index if not exists goats_name_trgm_idx         on goats using gin (name gin_trgm_ops);

-- crossings
create index if not exists crossings_dam_id_idx           on crossings (dam_id);
create index if not exists crossings_sire_id_idx          on crossings (sire_id);
create index if not exists crossings_status_idx           on crossings (status);
create index if not exists crossings_crossing_date_idx    on crossings (crossing_date desc);
create index if not exists crossings_expected_kidding_idx on crossings (expected_kidding_date);
-- partial index: the "who is due soon" query only ever looks at pregnant rows
create index if not exists crossings_pregnant_due_idx
  on crossings (expected_kidding_date)
  where status = 'pregnant';

-- child records: always filtered by goat, sorted by date
create index if not exists vaccinations_goat_date_idx   on vaccinations (goat_id, date_administered desc);
create index if not exists vaccinations_name_trgm_idx   on vaccinations using gin (vaccine_name gin_trgm_ops);
create index if not exists weights_goat_date_idx        on weights (goat_id, measured_on desc);
create index if not exists health_records_goat_date_idx on health_records (goat_id, record_date desc);
create index if not exists health_records_type_idx      on health_records (type);

-- expenses
create index if not exists expenses_date_idx     on expenses (expense_date desc);
create index if not exists expenses_paid_by_idx  on expenses (paid_by);
create index if not exists expenses_goat_id_idx  on expenses (goat_id);
create index if not exists expenses_category_idx on expenses (category);
create index if not exists expenses_name_trgm_idx on expenses using gin (name gin_trgm_ops);

-- settlements
create index if not exists settlements_settled_on_idx on settlements (settled_on desc);
create index if not exists settlements_from_user_idx  on settlements (from_user);
create index if not exists settlements_to_user_idx    on settlements (to_user);

-- ---------------------------------------------------------------------------
-- allocate_goat_tag — atomically hands out the next tag for a breed.
-- `update ... returning` takes a row lock, so concurrent inserts can never
-- receive the same number. Produces e.g. BGF-MC-01, BGF-MC-02, BGF-TD-01.
-- ---------------------------------------------------------------------------
create or replace function allocate_goat_tag(p_breed_id uuid, p_prefix text default 'BGF')
returns text as $$
declare
  v_code text;
  v_seq  integer;
begin
  update breeds
     set next_seq = next_seq + 1
   where id = p_breed_id
  returning code, next_seq - 1 into v_code, v_seq;

  if v_code is null then
    raise exception 'Unknown breed: %', p_breed_id using errcode = 'foreign_key_violation';
  end if;

  -- Zero-padded to two digits, but never truncated: plain `lpad(x, 2, '0')`
  -- CUTS a longer string down to two characters, so the hundredth goat of a
  -- breed would be handed '10' and collide with the tenth.
  return upper(p_prefix) || '-' || v_code || '-'
      || lpad(v_seq::text, greatest(2, length(v_seq::text)), '0');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Row-level security.
-- The FastAPI backend is the only thing that ever talks to these tables — it
-- connects with the project's Postgres role directly (not through Supabase
-- Auth/PostgREST), so there is no "authenticated" JWT for Postgres policies
-- to check here. RLS on these tables would just be dead weight; the API is
-- the real gatekeeper. (The `goat-photos` storage bucket below is the one
-- thing the browser reaches directly, so it keeps real policies.)
-- ---------------------------------------------------------------------------
