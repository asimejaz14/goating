-- ============================================================================
-- Goat Farm Portal — 0005 fix: stop truncating tag numbers past 99
--
-- `allocate_goat_tag` built the counter with `lpad(v_seq::text, 2, '0')`.
-- `lpad` pads a short string *and truncates a long one*, so the counter was
-- silently cut to two characters once a breed passed its 99th goat:
--
--     seq  99 -> '99'   BGF-MC-99   correct
--     seq 100 -> '10'   BGF-MC-10   collides with the tenth goat
--     seq 325 -> '32'   BGF-MC-32   collides with the thirty-second
--
-- The unique index on `goats.tag_number` then rejected the insert, so adding a
-- goat to a breed that had reached a hundred failed every time with a conflict
-- and no way to recover from the UI. The counter itself kept advancing, so the
-- damage was confined to tag rendering — no existing rows are wrong.
--
-- Padding to two digits is still what a small herd wants (BGF-MC-01), so the
-- minimum stays; only the truncation goes.
--
-- Safe to run more than once, and safe on a database that never got past 99.
-- ============================================================================

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

  return upper(p_prefix) || '-' || v_code || '-'
      || lpad(v_seq::text, greatest(2, length(v_seq::text)), '0');
end;
$$ language plpgsql;

-- A breed whose counter fell behind its own goats (because earlier attempts
-- consumed numbers that then failed to insert, or because rows were loaded
-- directly) would keep handing out tags that already exist. Realign every
-- counter with the highest tag actually in use.
update breeds b
   set next_seq = greatest(
         b.next_seq,
         coalesce((
           select max((regexp_replace(g.tag_number, '^.*-', ''))::int)
             from goats g
            where g.breed_id = b.id
              and g.tag_number ~ '-[0-9]+$'
         ), 0) + 1
       );
