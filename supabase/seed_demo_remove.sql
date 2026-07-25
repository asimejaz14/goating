-- ============================================================================
-- Goat Farm Portal — remove the demo data
--
-- Deletes everything `seed_demo.sql` created and nothing else. Demo rows are
-- identifiable by their id, which always begins `dddd` — anything you entered
-- yourself has a normal random uuid and is left alone.
--
-- Paste into the Supabase SQL editor and run.
-- ============================================================================

-- Children first: goats cascade to their own logs, but expenses only null out
-- their goat link, so ordering keeps foreign keys happy either way.
delete from settlements    where id::text like 'dddd%';
delete from expenses       where id::text like 'dddd%';
delete from health_records where id::text like 'dddd%';
delete from weights        where id::text like 'dddd%';
delete from vaccinations   where id::text like 'dddd%';

-- Break the goat↔crossing links before removing either side.
update goats set crossing_id = null where crossing_id::text like 'dddd%';
update goats set dam_id = null where dam_id::text like 'dddd%';
update goats set sire_id = null where sire_id::text like 'dddd%';

delete from crossings where id::text like 'dddd%';
delete from goats     where id::text like 'dddd%';

-- Hand the tag numbers back so a real BGF-MC-01 starts from the right place.
update breeds b
   set next_seq = 1 + coalesce(
     (select count(*) from goats g where g.breed_id = b.id), 0);
