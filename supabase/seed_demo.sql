-- ============================================================================
-- Goat Farm Portal — DEMO DATA (safe to delete)
--
-- Fills the portal with roughly seven months of plausible farm activity so it
-- can be shown to someone before the real records exist. Run it after the
-- three migrations.
--
-- Every row this file creates has an id beginning `dddd`, which is what makes
-- `seed_demo_remove.sql` able to take all of it back out again without
-- touching anything you have entered yourself.
--
-- Dates are all relative to the day you run it, so the dashboard always looks
-- current — pregnancies are genuinely due soon, expenses land in this month.
-- Re-running is safe: it clears its own rows first.
-- ============================================================================

-- Start from a clean slate so re-running never doubles the herd. This is the
-- same set of statements as seed_demo_remove.sql, inlined because the Supabase
-- SQL editor has no psql meta-commands to include a file with.
delete from settlements    where id::text like 'dddd%';
delete from expenses       where id::text like 'dddd%';
delete from health_records where id::text like 'dddd%';
delete from weights        where id::text like 'dddd%';
delete from vaccinations   where id::text like 'dddd%';
update goats set crossing_id = null where crossing_id::text like 'dddd%';
update goats set dam_id = null where dam_id::text like 'dddd%';
update goats set sire_id = null where sire_id::text like 'dddd%';
delete from crossings where id::text like 'dddd%';
delete from goats     where id::text like 'dddd%';
update breeds b
   set next_seq = 1 + coalesce(
     (select count(*) from goats g where g.breed_id = b.id), 0);

do $$
declare
  u1 uuid;
  u2 uuid;
  b_mc uuid;
  b_td uuid;
  b_rp uuid;
  today date := current_date;

  doe_names text[] := array[
    'Laila','Noor','Chandni','Heera','Rani','Sona','Gul','Preeto',
    'Basanti','Mehr','Zara','Sitara','Roshni','Mahi','Anaar','Kajal'];
  buck_names text[] := array['Sultan','Raja','Badshah','Sikandar','Tipu','Kaka'];
  colours text[] := array[
    'White with brown patches','Fawn','Black and tan','Cream',
    'White','Brown with white belly','Speckled grey'];
  sources text[] := array[
    'Sahiwal mandi','Okara mandi','Neighbouring farm','Pattoki mandi','Private sale'];

  n int := 0;              -- running counter behind every demo uuid
  i int;
  j int;
  k int;

  gid uuid;
  cid uuid;
  dam uuid;
  sire uuid;
  bucks uuid[] := '{}';
  founders uuid[] := '{}';
  all_goats uuid[] := '{}';
  kid_dams uuid[] := '{}';

  born date;
  crossed date;
  kidded date;
  kid_count int;
  base_weight numeric;

  vaccines text[] := array['PPR','Enterotoxaemia','CCPP','FMD','Deworming (Ivermectin)'];
  exp_names text[];
  exp_cats text[];
  amt numeric;
  d date;
begin
  -- The two partners, oldest first — whoever 0003_seed.sql created.
  select id into u1 from users order by created_at, id limit 1;
  select id into u2 from users order by created_at, id offset 1 limit 1;
  if u1 is null then
    raise exception 'No users found. Run supabase/migrations/0003_seed.sql first.';
  end if;
  u2 := coalesce(u2, u1);

  select id into b_mc from breeds where code = 'MC';
  select id into b_td from breeds where code = 'TD';
  select id into b_rp from breeds where code = 'RP';
  if b_mc is null then
    raise exception 'Breeds are missing. Run supabase/migrations/0003_seed.sql first.';
  end if;

  -- Deterministic "randomness": the data varies naturally but is identical
  -- every run, so a demo never surprises you with a different herd.
  perform setseed(0.4242);

  -- ------------------------------------------------------------------
  -- Foundation does — bought in to start the herd, ~8 months ago
  -- ------------------------------------------------------------------
  for i in 1..8 loop
    n := n + 1;
    gid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    born := today - ((730 + i * 47))::int;          -- 2–3 years old
    insert into goats (
      id, tag_number, name, breed_id, sex, date_of_birth, acquisition_type,
      purchase_date, purchase_price, purchased_from, status,
      color, notes, created_by, created_at
    ) values (
      gid,
      allocate_goat_tag(case when i <= 6 then b_mc when i = 7 then b_td else b_rp end, 'BGF'),
      doe_names[i],
      case when i <= 6 then b_mc when i = 7 then b_td else b_rp end,
      'female', born, 'purchased',
      today - 240, 42000 + (i * 3500), sources[1 + (i % array_length(sources, 1))],
      'active',
      colours[1 + (i % array_length(colours, 1))],
      case when i = 1 then 'Foundation doe. Reliable twinner.' else null end,
      u1, (today - 240)::timestamptz + interval '9 hours'
    );
    founders := founders || gid;
    all_goats := all_goats || gid;
  end loop;

  -- ------------------------------------------------------------------
  -- Bucks
  -- ------------------------------------------------------------------
  for i in 1..3 loop
    n := n + 1;
    gid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    insert into goats (
      id, tag_number, name, breed_id, sex, date_of_birth, acquisition_type,
      purchase_date, purchase_price, purchased_from, status,
      color, notes, created_by, created_at
    ) values (
      gid,
      allocate_goat_tag(case when i < 3 then b_mc else b_td end, 'BGF'),
      buck_names[i],
      case when i < 3 then b_mc else b_td end,
      'male', today - (900 + i * 60), 'purchased',
      today - 235, 65000 + (i * 9000), sources[2],
      'active',
      colours[i], case when i = 1 then 'Main stud buck.' else null end,
      u1, (today - 235)::timestamptz + interval '10 hours'
    );
    bucks := bucks || gid;
    all_goats := all_goats || gid;
  end loop;

  -- ------------------------------------------------------------------
  -- Crossings, and the kids that came out of the finished ones
  -- ------------------------------------------------------------------

  -- (a) Five that have already kidded, spread across the last five months
  for i in 1..5 loop
    dam := founders[i];
    sire := bucks[1 + (i % 3)];
    kidded := today - (i * 33 + 8);
    crossed := kidded - 150 - ((i % 5) - 2);   -- real kidding drifts a few days
    kid_count := case when i in (1, 3, 4) then 2 when i = 5 then 3 else 1 end;

    n := n + 1;
    cid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    insert into crossings (
      id, dam_id, sire_id, crossing_date, expected_kidding_date,
      actual_kidding_date, number_of_kids, status, notes, created_by, created_at
    ) values (
      cid, dam, sire, crossed, crossed + 150, kidded, kid_count, 'kidded',
      case when kid_count = 3 then 'Triplets — smallest one hand-fed for a week.'
           when kid_count = 2 then 'Twins, both up and feeding quickly.'
           else null end,
      u1, crossed::timestamptz + interval '8 hours'
    );

    for j in 1..kid_count loop
      n := n + 1;
      gid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
      insert into goats (
        id, tag_number, name, breed_id, sex, date_of_birth, acquisition_type,
        status, dam_id, sire_id, crossing_id, color, created_by, created_at
      ) values (
        gid,
        allocate_goat_tag(b_mc, 'BGF'),
        case when (i + j) % 3 = 0 then null                       -- not every kid is named yet
             when (i + j) % 2 = 0 then doe_names[8 + ((i + j) % 8)]
             else buck_names[1 + ((i + j) % 5)] end,
        b_mc,
        (case when (i + j) % 2 = 0 then 'female' else 'male' end)::goat_sex,
        kidded, 'bred', 'active', dam, sire, cid,
        colours[1 + ((i * j) % array_length(colours, 1))],
        u1, kidded::timestamptz + interval '7 hours'
      );
      all_goats := all_goats || gid;
      if (i + j) % 2 = 0 then kid_dams := kid_dams || gid; end if;
    end loop;
  end loop;

  -- (b) Four pregnancies in progress, due at staggered points ahead
  for i in 1..4 loop
    dam := founders[i + 2];
    sire := bucks[1 + (i % 3)];
    -- Due in 9, 23, 48 and 88 days, so the countdown has something in it
    -- at every range the dashboard cares about.
    crossed := today - (150 - (case i when 1 then 9 when 2 then 23
                                      when 3 then 48 else 88 end));
    n := n + 1;
    cid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    insert into crossings (
      id, dam_id, sire_id, crossing_date, expected_kidding_date,
      status, created_by, created_at
    ) values (
      cid, dam, sire, crossed, crossed + 150, 'pregnant',
      u2, crossed::timestamptz + interval '8 hours'
    );
  end loop;

  -- (c) Two overdue, which is what the red countdown is for
  for i in 1..2 loop
    dam := founders[6 + i];
    sire := bucks[1];
    crossed := today - (150 + i * 4 + 2);
    n := n + 1;
    cid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    insert into crossings (
      id, dam_id, sire_id, crossing_date, expected_kidding_date,
      status, notes, created_by, created_at
    ) values (
      cid, dam, sire, crossed, crossed + 150, 'pregnant',
      'Watching daily now.', u2, crossed::timestamptz + interval '8 hours'
    );
  end loop;

  -- (d) One that did not take, and one lost — the ledger should show both
  n := n + 1;
  insert into crossings (
    id, dam_id, sire_id, crossing_date, expected_kidding_date, status, notes,
    created_by, created_at
  ) values (
    ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    founders[2], bucks[2], today - 205, today - 55, 'failed',
    'Came back into heat after three weeks.', u1,
    (today - 205)::timestamptz + interval '8 hours'
  );
  n := n + 1;
  insert into crossings (
    id, dam_id, sire_id, crossing_date, expected_kidding_date, status, notes,
    created_by, created_at
  ) values (
    ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    founders[4], bucks[3], today - 190, today - 40, 'aborted',
    'Aborted at around four months. Vet suspected a feed issue.', u2,
    (today - 190)::timestamptz + interval '8 hours'
  );

  -- ------------------------------------------------------------------
  -- A few more bought in over the last six months, so the herd grows
  -- ------------------------------------------------------------------
  for i in 1..5 loop
    n := n + 1;
    gid := ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    insert into goats (
      id, tag_number, name, breed_id, sex, date_of_birth, acquisition_type,
      purchase_date, purchase_price, purchased_from, status,
      color, created_by, created_at
    ) values (
      gid,
      allocate_goat_tag(case when i <= 3 then b_mc when i = 4 then b_td else b_rp end, 'BGF'),
      doe_names[9 + i],
      case when i <= 3 then b_mc when i = 4 then b_td else b_rp end,
      (case when i = 5 then 'male' else 'female' end)::goat_sex,
      today - (400 + i * 30), 'purchased',
      today - (30 * i + 12), 38000 + i * 4200,
      sources[1 + (i % array_length(sources, 1))],
      'active', colours[1 + (i % array_length(colours, 1))],
      u2, (today - (30 * i + 12))::timestamptz + interval '11 hours'
    );
    all_goats := all_goats || gid;
  end loop;

  -- ------------------------------------------------------------------
  -- One sold, one died — both keep their history and their pedigree
  -- ------------------------------------------------------------------
  update goats set status = 'sold'
   where id = all_goats[array_length(all_goats, 1) - 1];

  update goats
     set status = 'expired',
         expired_on = today - 26,
         death_cause = 'Found down in the morning; vet suspected bloat.'
   where id = all_goats[13];

  -- ------------------------------------------------------------------
  -- Vaccinations — a real log, two or three per goat
  -- ------------------------------------------------------------------
  for i in 1..array_length(all_goats, 1) loop
    for j in 1..(2 + (i % 2)) loop
      n := n + 1;
      insert into vaccinations (
        id, goat_id, vaccine_name, date_administered, dose, notes, created_by, created_at
      ) values (
        ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
        all_goats[i],
        vaccines[1 + ((i + j) % 5)],
        today - ((j * 58 + (i * 7) % 30))::int,
        case when (i + j) % 2 = 0 then '2 ml' else '1 ml' end,
        null,
        case when (i + j) % 2 = 0 then u1 else u2 end,
        now()
      );
    end loop;
  end loop;

  -- ------------------------------------------------------------------
  -- Weights — a rising curve per goat, so the growth charts have shape
  -- ------------------------------------------------------------------
  for i in 1..array_length(all_goats, 1) loop
    select case when date_of_birth > today - 200 then 9 else 28 end
      into base_weight from goats where id = all_goats[i];
    for j in 1..4 loop
      n := n + 1;
      insert into weights (
        id, goat_id, weight_kg, measured_on, notes, created_by, created_at
      ) values (
        ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
        all_goats[i],
        round((base_weight + (j * (2.4 + (i % 3) * 0.4)) + (random() * 1.2))::numeric, 2),
        today - ((4 - j) * 45 + (i % 9))::int,
        null,
        case when j % 2 = 0 then u1 else u2 end,
        now()
      );
    end loop;
  end loop;

  -- ------------------------------------------------------------------
  -- Health records
  -- ------------------------------------------------------------------
  for i in 1..16 loop
    n := n + 1;
    insert into health_records (
      id, goat_id, record_date, type, description, medication, notes, created_by, created_at
    ) values (
      ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
      all_goats[1 + (i * 3) % array_length(all_goats, 1)],
      today - (i * 11 + 4),
      (array['checkup','deworming','treatment','illness'])[1 + (i % 4)]::health_record_type,
      (array[
        'Routine check — condition score good.',
        'Six-monthly deworming.',
        'Treated for foot rot on the near hind.',
        'Off feed for two days, mild scour.',
        'Hoof trim.',
        'Eye infection, treated and cleared.'
      ])[1 + (i % 6)],
      (array['Ivermectin','Oxytetracycline',null,'Albendazole'])[1 + (i % 4)],
      null,
      case when i % 2 = 0 then u1 else u2 end,
      now()
    );
  end loop;

  -- ------------------------------------------------------------------
  -- Expenses — roughly six months of real farm spending
  -- ------------------------------------------------------------------
  exp_names := array[
    'Wanda (feed concentrate)','Chokar sacks','Bhoosa / dry fodder','Green fodder cut',
    'Maize silage','Mineral blocks','Vet visit','Deworming medicine','Vaccine doses',
    'Antibiotic course','Farm worker wages','Extra labour — shed cleaning',
    'Water tank repair','Feeding troughs','Fencing wire','Transport to mandi',
    'Diesel for generator','Electricity bill','Rock salt','Hoof trimming tools'];
  exp_cats := array[
    'Feed','Feed','Feed','Feed',
    'Feed','Feed','Health','Health','Health',
    'Health','Labour','Labour',
    'Equipment','Equipment','Equipment','Transport',
    'Utilities','Utilities','Feed','Equipment'];

  for i in 1..135 loop
    k := 1 + (i * 7) % 20;
    d := today - ((i * 185 / 135) + (i % 4))::int;   -- spread across ~185 days
    amt := case exp_cats[k]
             when 'Feed'      then 2800 + (random() * 14000)
             when 'Health'    then 900  + (random() * 6200)
             when 'Labour'    then 15000 + (random() * 9000)
             when 'Equipment' then 1200 + (random() * 17000)
             when 'Transport' then 1000 + (random() * 4200)
             else 1800 + (random() * 4500)
           end;
    n := n + 1;
    insert into expenses (
      id, expense_date, name, amount, paid_by, goat_id, category, notes,
      created_by, created_at
    ) values (
      ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
      d,
      exp_names[k],
      round(amt::numeric, -1),                       -- nobody records odd rupees
      case when i % 2 = 0 then u1 else u2 end,
      -- Only the vet-type costs get pinned to a particular goat.
      case when exp_cats[k] = 'Health' and i % 3 = 0
           then all_goats[1 + (i * 5) % array_length(all_goats, 1)] else null end,
      exp_cats[k],
      null,
      case when i % 2 = 0 then u1 else u2 end,
      d::timestamptz + interval '17 hours'
    );
  end loop;

  -- ------------------------------------------------------------------
  -- Two past settle-ups, so the ledger has history and a live balance
  -- ------------------------------------------------------------------
  n := n + 1;
  insert into settlements (id, from_user, to_user, amount, settled_on, note, created_by, created_at)
  values (
    ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    u2, u1, 24500, today - 128, 'Squared up for the winter feed run.', u1, now()
  );
  n := n + 1;
  insert into settlements (id, from_user, to_user, amount, settled_on, note, created_by, created_at)
  values (
    ('dddd0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    u1, u2, 18200, today - 61, 'Easypaisa transfer.', u2, now()
  );

  raise notice 'Demo data loaded: % goats, % crossings, % expenses.',
    (select count(*) from goats where id::text like 'dddd%'),
    (select count(*) from crossings where id::text like 'dddd%'),
    (select count(*) from expenses where id::text like 'dddd%');
end $$;
