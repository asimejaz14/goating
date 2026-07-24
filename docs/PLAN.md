# Goat Farm Portal — Complete Implementation Plan

## Context
The user runs a goat farm (currently Makhi Cheeni; Teddy & Rajan Puri available for later)
with a friend as an equal partner. Nothing is tracked digitally today — the repo is empty.
They want a production-grade web portal to manage the herd end to end: full CRUD on goats,
crossing (mating) → kidding lifecycle with a live days-to-birth countdown, kids per crossing,
an **auto-building pedigree tree**, manual vaccination logs, weight & health records, optional
photos, and a **shared expense ledger with monthly history and 50/50 settle-up**. Clicking any
goat must reveal its **entire life history in one place**. The UI must be world-class,
dead-simple, farm-flavored, animated, and fully usable on a phone.

As the herd and the expense ledger grow, every list will outgrow a single screen — so
**consistent filtering, sorting, searching and pagination across the whole system** is a
first-class requirement, not an afterthought.

---

## Locked-in decisions
- **Auth:** Supabase Auth, 2 users (owner + friend), identical unrestricted roles; open to more later.
- **Design:** "Warm farm soft-UI" — earthy greens/creams/browns, soft rounded cards, gentle shadows (keeps the neumorphic softness but stays high-contrast and readable on a phone in daylight). Flat icons (lucide), Framer-Motion transitions. Fully responsive.
- **Goat ID:** `BGF-<BREED-INITIALS>-NN`, uppercase, **counter restarts per breed**, zero-padded (`BGF-MC-01`, `BGF-MC-02`). `BGF` is a configurable farm prefix; breed codes stored per breed (MC/TD/RP). Auto-generated and locked (not hand-editable).
- **Breeds:** seeded in DB — Makhi Cheeni (MC), Teddy (TD), Rajan Puri (RP). Only Makhi Cheeni goats exist today.
- **Acquisition type:** each goat is **Bred (born here)** or **Purchased (from market)**; purchased goats capture optional purchase date, price and source.
- **Photos optional:** upload is optional; a friendly goat **placeholder image** shows when there's no photo.
- **Vaccinations = manual log only:** "this goat was vaccinated with X on <date>". **No due/upcoming/pending reminders** anywhere.
- **Parent linking builds the pedigree:** after a kid is added, the user **links it to its mother (dam) and father (sire)** via a searchable picker (bred goats can auto-fill both from their crossing). Those links are what grow the tree.
- **Mark as expired (death):** sets status → expired (optional date & cause). Expired goats are **kept for history and pedigree** but **excluded from all active processing** — out of active counts, out of crossing/parent pickers, cannot start new crossings. Still browsable via a status filter.
- **Crossings:** a record captures **which doe was crossed with which buck on what crossing date**. Crossing date drives the estimate (crossing_date + 150d). The **actual kidding date is entered manually** and may differ, as may each kid's DOB.
- **Expenses:** date, name, cost, payer (auto from logged-in user), optional goat link; split **50/50** between the two partners; **monthly filtering + month-over-month history + trend chart**; **Settle up** action. Currency **PKR (₨)**, configurable.
- **Pedigree:** 4 generations by default, expandable; a missing ancestor renders a muted **breed-name placeholder** with an "add/link parent" affordance.
- **Gestation:** 150 days default, configurable.
- **Supabase:** scaffolded with SQL migrations + seed; user pastes keys into `.env`. Deploy notes (Vercel + Render/Railway) documented for later.
- **No milk tracking.**

---

## Architecture
- **Next.js frontend** → calls the **FastAPI backend** for all data. Talks to Supabase directly only for (a) Auth login/session and (b) Storage upload of goat photos.
- **FastAPI backend** → the single API layer. Connects to Supabase Postgres, verifies the Supabase JWT on every request, owns all business logic (ID generation, pedigree, settle-up, aggregation, **filtering & pagination**).
- **Supabase** → Postgres + Auth + Storage bucket (`goat-photos`).

### Tech stack
- **Frontend:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Framer Motion, TanStack Query (caching/pagination state), Recharts, lucide-react, `@supabase/supabase-js`, thin fetch-based API client.
- **Backend:** FastAPI, SQLAlchemy 2.0 async + asyncpg, Pydantic v2, python-jose (JWT verify), uvicorn.
- **DB:** Supabase Postgres; plain SQL migrations (runnable via Supabase SQL editor or CLI).

---

## Data model (Supabase Postgres)
- **profiles** — `id` (uuid → auth.users), `display_name`, `email`, `created_at`. Seeded with the 2 partners.
- **breeds** — `id`, `name` (unique), `code` (unique initials, e.g. MC), `next_seq` (per-breed ID counter), `description`.
- **goats** — `id`, `tag_number` (unique, `BGF-MC-01`), `name?`, `breed_id`, `sex` (male/female), `date_of_birth?` (manual), `acquisition_type` (bred/purchased), `purchase_date?`, `purchase_price?`, `purchased_from?`, `status` (active/sold/expired, default active), `expired_on?`, `death_cause?`, `dam_id?`→goats, `sire_id?`→goats, `crossing_id?`→crossings, `color?`, `photo_url?` (nullable → placeholder), `notes?`, `created_by`, `created_at`, `updated_at`.
- **crossings** — `id`, `dam_id`→goats, `sire_id?`→goats, `crossing_date`, `expected_kidding_date` (computed), `actual_kidding_date?` (manual), `number_of_kids?`, `status` (pregnant/kidded/aborted/failed), `notes?`, `created_by`, `created_at`.
- **vaccinations** — `id`, `goat_id`, `vaccine_name`, `date_administered`, `dose?`, `notes?`, `created_by`, `created_at`. (Manual log only — no due-date field.)
- **weights** — `id`, `goat_id`, `weight_kg`, `measured_on`, `notes?`.
- **health_records** — `id`, `goat_id`, `record_date`, `type` (illness/treatment/deworming/checkup), `description`, `medication?`, `notes?`.
- **expenses** — `id`, `expense_date`, `name`, `amount`, `paid_by`→profiles, `goat_id?`, `category?`, `notes?`, `created_by`, `created_at`.
- **settlements** — `id`, `from_user`→profiles, `to_user`→profiles, `amount`, `settled_on`, `note?`, `created_at`.

### Indexes (chosen to serve the filters/sorts below)
`goats(status)`, `goats(breed_id)`, `goats(sex)`, `goats(acquisition_type)`, `goats(dam_id)`, `goats(sire_id)`, `goats(date_of_birth)`, plus a **trigram index on `goats(tag_number, name)`** for fast search;
`crossings(dam_id)`, `crossings(sire_id)`, `crossings(status)`, `crossings(crossing_date)`, `crossings(expected_kidding_date)`;
`vaccinations(goat_id, date_administered)`; `weights(goat_id, measured_on)`; `health_records(goat_id, record_date)`;
`expenses(expense_date)`, `expenses(paid_by)`, `expenses(goat_id)`, `expenses(category)`.
RLS enabled with authenticated-user policies (defense in depth; FastAPI is the primary gatekeeper).

---

## Filtering, sorting, search & pagination (system-wide)

### Shared contract
Every list endpoint uses the **same query-param grammar and the same response envelope**, so the frontend has one reusable hook and one reusable filter-bar component.

**Common params** (`app/core/pagination.py` → `PageParams` FastAPI dependency):
| Param | Meaning | Default |
|---|---|---|
| `page` | 1-based page number | `1` |
| `page_size` | rows per page (**max 100**) | `20` |
| `sort_by` | column to sort on — validated against a **per-resource whitelist** | resource default |
| `sort_dir` | `asc` \| `desc` | `desc` |
| `q` | free-text search (ILIKE / trigram over that resource's text fields) | — |

**Response envelope** (generic `Page[T]` Pydantic model):
```json
{
  "items": [ ... ],
  "page": 1,
  "page_size": 20,
  "total": 137,
  "total_pages": 7,
  "has_next": true,
  "has_prev": false
}
```
Expense lists extend it with a `summary` block (`total_amount`, `per_payer` totals) so filtered
totals are always correct for the **whole filtered set**, not just the current page.

**Implementation:** `app/core/pagination.py` holds `PageParams`, `Page[T]`, and a single
`paginate(session, stmt, params)` helper (runs a `count()` over the same filters, then
`LIMIT/OFFSET`). `app/core/filters.py` holds reusable builders — `date_range()`, `text_search()`,
`enum_in()`, `numeric_range()` — plus the `SORTABLE_FIELDS` whitelist per resource (guards against
SQL injection via `sort_by`). Every router composes these; no bespoke pagination anywhere.

**Strategy:** offset pagination with an exact total count — right for this data scale (hundreds to
low thousands) and it enables real page numbers and "Showing 1–20 of 137". `page_size` is hard-capped
at 100 server-side so a malformed request can't pull the whole table.

### Per-resource filters
**Goats** `GET /goats` — `q` (tag number or name) · `breed_id` · `sex` · `status` (multi-select, **defaults to `active`** so expired/sold stay out of the way) · `acquisition_type` (bred/purchased) · `is_pregnant` · `dob_from`/`dob_to` · `age_min_months`/`age_max_months` · `has_photo` · `dam_id`/`sire_id` (list a goat's offspring) · `has_parents` (find goats still needing parent links).
Sort: `tag_number` (default), `name`, `date_of_birth`, `created_at`.

**Crossings** `GET /crossings` — `q` · `dam_id` · `sire_id` · `status` (pregnant/kidded/aborted/failed) · `crossing_date_from`/`_to` · `expected_kidding_from`/`_to` · `due_within_days` (drives the dashboard's upcoming-kiddings view) · `year`.
Sort: `crossing_date` (default desc), `expected_kidding_date`, `actual_kidding_date`, `number_of_kids`.

**Vaccinations** `GET /vaccinations` — `q` · `goat_id` · `vaccine_name` · `date_from`/`date_to`. Sort: `date_administered` (default desc).

**Weights** `GET /weights` — `goat_id` · `date_from`/`date_to`. Sort: `measured_on` desc.

**Health records** `GET /health` — `q` · `goat_id` · `type` · `date_from`/`date_to`. Sort: `record_date` desc.

**Expenses** `GET /expenses` — `q` (name/notes) · `month=YYYY-MM` · `date_from`/`date_to` · `paid_by` · `category` · `goat_id` · `min_amount`/`max_amount`. Sort: `expense_date` (default desc), `amount`, `name`. Returns the `summary` block described above.

**Settlements** `GET /settlements` — `date_from`/`date_to` · `from_user` · `to_user`. Sort: `settled_on` desc.

### Where pagination deliberately does *not* apply
- **Dashboard** returns aggregates only (plus a capped alerts feed) — never raw lists.
- **Pedigree tree** is bounded by `generations` (default 4, **max 6**) rather than paginated, which also protects the recursive CTE from runaway depth.
- **Goat 360 detail** loads **capped previews** (latest 5 per section) with a "View all →" that deep-links to the corresponding list page pre-filtered by `goat_id`. This keeps the centerpiece page fast even for a goat with years of history. The activity timeline paginates with "Load more".

### Frontend behavior (one shared implementation)
- **Filters live in the URL query string** — shareable, bookmarkable, and survives refresh and the back button.
- One `useFilters()` + `usePaginatedQuery()` hook pair (TanStack Query) used by every list, with `keepPreviousData` so pages swap without flicker.
- **Debounced search** (300ms).
- **Active-filter chips** with individual ✕ and a "Clear all"; on mobile the filter panel is a **bottom-sheet drawer** with an Apply button and a badge showing how many filters are active.
- **Desktop:** numbered pager + result count. **Mobile:** "Load more" / infinite scroll — same endpoint, same envelope.
- **Two distinct empty states:** "nothing here yet" (teaches the next action) vs "no results match these filters" (offers Clear filters).
- Skeleton rows during page changes; scroll position preserved.

---

## Key logic
**ID generation** (`services/ids.py`): on goat create, atomically increment `breeds.next_seq` for that breed (row-locked), format `f"{FARM_PREFIX}-{code}-{seq:02d}"`. Unique constraint on `tag_number` as a safety net.

**Parent linking + auto-building pedigree** (`services/pedigree.py`): the user links a kid to its dam and sire via a searchable picker (auto-fillable from its crossing). `POST /goats/{id}/link-parents` sets the links; each link grows the tree with zero manual tree-drawing. `GET /goats/{id}/pedigree?generations=4` returns a nested ancestor tree via a recursive CTE, with **cycle protection** (a goat can never become its own ancestor). Missing parent → placeholder node carrying the descendant's breed name.

**Days-to-birth countdown**: for each `pregnant` crossing, `days_remaining = (crossing_date + gestation_days) − today`; overdue when negative. Superseded the moment the manual `actual_kidding_date` is saved (status → kidded).

**Kids per crossing**: `crossings.number_of_kids`; per-doe total = SUM across her crossings.

**Expense settle-up + monthly history** (`services/expenses.py`): per user, `net = paid − total/2 + settlements_paid − settlements_received`. Positive ⇒ owed; nets always sum to 0. UI reads "You are owed ₨X" / "You owe ₨X to <partner>". **Settle up** records a settlement, driving nets to 0. `GET /expenses/monthly` returns per-month totals + per-payer split for the history list and trend chart.

---

## Backend structure & endpoints
```
backend/app/
  main.py  config.py  database.py  auth.py (JWT verify)
  core/    pagination.py (PageParams, Page[T], paginate)
           filters.py    (date_range, text_search, enum_in, numeric_range, SORTABLE_FIELDS)
  models/  schemas/
  routers/ goats, breeds, crossings, vaccinations, weights, health, expenses, settlements,
           dashboard, pedigree
  services/ ids, pedigree, expenses, dashboard
  tests/
```
Paginated REST CRUD per resource (all sharing the contract above), plus:
`GET /dashboard/summary` · `GET /goats/{id}/history` (the 360 view in one call, with capped
section previews) · `GET /goats/{id}/pedigree` · `POST /goats/{id}/link-parents` ·
`POST /goats/{id}/expire` · `GET /expenses/balance` · `GET /expenses/monthly` ·
`POST /expenses/settle` · `GET /crossings/upcoming`. Swagger at `/docs`.

---

## Frontend pages
- `/login` — Supabase Auth (email/password).
- `/` **Dashboard** — cards: total goats, sex breakdown (does/bucks/kids), bred vs purchased, currently pregnant, upcoming kiddings (30d), kids born this year, **expense settle-up**. Charts: herd growth (line), births per month (bar), sex distribution (donut), kids-per-doe leaderboard, **monthly expense trend**. Capped alerts feed (upcoming kiddings). Animated card reveals and stat count-ups. *(No vaccination due-soon card — vaccinations are a manual log.)*
- `/goats` — searchable, **fully filterable and paginated** grid of goat cards (photo or placeholder, tag, breed, sex, age, pregnant badge, bred/purchased tag, status badge). Active goats by default. Add form: **Bred or Purchased**, optional photo.
- `/goats/[id]` — **the goat's complete 360 history — the centerpiece.** One click surfaces:
  - **Profile:** photo/placeholder, tag ID, name, breed, sex, age, status badge (expired/sold), bred/purchased with purchase details; quick actions (edit, link parents, add crossing/vaccination/weight/health, **mark as expired**).
  - **Parents & pedigree:** linked mother & father (clickable), inline **mini pedigree tree**, link to the full tree.
  - **Kids:** every offspring, grouped by crossing, clickable, with total count.
  - **Crossing history:** every crossing (as dam or sire) — crossing date, expected vs **actual** kidding date, kids, status, live countdown for active pregnancies.
  - **Vaccination log · weight history + growth chart · health records · linked expenses.**
  - **Unified activity timeline:** one reverse-chronological feed merging every event (born, crossed, kidded, vaccinated, weighed, treated, sold, expense) so the whole life story reads top-to-bottom. Sections are capped previews with "View all →" into the pre-filtered list pages; timeline paginates via "Load more". Tabs/accordions keep it scannable on mobile.
- `/crossings` — filterable, paginated list; record a crossing (**doe × buck + crossing date**); expected-kidding estimate + live countdown; **manual actual kidding date + kids count**; on kidding, register kids with **manual DOB** and auto-link parents.
- `/pedigree` — full explorer: search a goat by name/tag → animated tree (recursive SVG/flex component, zoom/pan, Framer-Motion node fade-in, breed-name placeholders, expandable depth).
- `/vaccinations` — filterable, paginated manual log (add + list). No schedule/due-soon.
- `/expenses` — ledger with **month filter, date range, payer/category/goat filters, amount range**, monthly history + trend chart, filtered totals, add expense (payer auto), settle-up summary + **Settle up** button.
- Layout: responsive shell — sidebar on desktop, bottom tab bar on mobile; animated page transitions.

**Components:** `ui/` (SoftCard, StatCard, Button, Input, Modal, Badge, Toast, EmptyState, Skeleton, **FilterBar, FilterDrawer, FilterChips, Pagination, SearchInput, SortSelect**), `charts/`, `tree/PedigreeTree`, `forms/` (GoatForm, CrossingForm, ExpenseForm, VaccinationForm…), `layout/` (Nav, Shell).
**lib/:** `apiClient`, `supabaseClient`, `useFilters`, `usePaginatedQuery`, gestation/date utils, currency format.

---

## Design system
Tailwind theme with a farm palette (pasture greens, cream, warm barn brown, muted gold accent), soft shadow utilities, rounded-2xl cards, consistent tokens (spacing/radius/shadow/type scale). Framer Motion for fade/slide and tree reveals. lucide flat icons. Mobile-first.

## UX & quality bar (world-class, production-grade — non-negotiable)
Top priority. Every screen is held to a "my non-technical partner can use it on his phone with zero training" test.
- **Effortless flows:** fewest taps for the common jobs. Smart defaults (today's date prefilled, payer auto-set, breed remembered), inline searchable pickers, no dead-ends.
- **Guidance everywhere:** teaching empty states, contextual helper text, plain-language labels.
- **Feedback & safety:** optimistic updates, **skeletons** (never full-page spinners), success/error **toasts**, inline validation with human error messages, confirm dialogs on destructive actions.
- **Motion with purpose:** subtle, fast (150–250ms) page/card fade-slide, animated pedigree reveal, stat count-ups; respects `prefers-reduced-motion`.
- **Mobile-first ergonomics:** thumb-reachable bottom nav, ≥44px tap targets, sticky primary actions, bottom-sheet filters, tested at 360–414px first.
- **Accessibility:** WCAG AA contrast, visible focus states, semantic HTML/ARIA, keyboard navigable.
- **Consistency:** one cohesive component library reused everywhere so nothing feels bolted-on.

---

## Repo structure
```
/ (root)
  frontend/   (Next.js)
  backend/    (FastAPI)
  supabase/   migrations/ (0001_init, 0002_seed, 0003_rls_functions) + README
  docs/PLAN.md  (this plan, committed to the repo)
  README.md   (setup: env keys, run migrations, start backend, start frontend)
  .gitignore
```

## Build phases
1. Scaffold repo, Supabase migrations + seed (breeds, profiles, storage bucket, indexes), README, `docs/PLAN.md`.
2. FastAPI: config/db/auth, **`core/pagination.py` + `core/filters.py` first** (so every router is built on them), models/schemas, breeds & goats CRUD + ID generation + goat filters.
3. Crossings (mating → kidding, manual dates) + pedigree service + vaccinations/weights/health, each with their filter sets.
4. Expenses + settle-up + monthly history + filtered summaries + dashboard aggregation.
5. Next.js: design system, auth, layout/nav, **shared filter/pagination hooks + components**, goats list & 360 detail.
6. Crossings UI, pedigree tree, vaccinations, weights/health, expenses (monthly), dashboard charts.
7. Polish to the quality bar: micro-interactions, skeletons + toasts, both empty-state variants, full responsive + accessibility pass, reduced-motion, README finalization.

## Verification
- **Backend unit tests (no cloud needed):** ID format & per-breed sequencing (`BGF-MC-01`, `-02`), gestation/days-to-birth math, settle-up net formula (nets sum to zero), pedigree assembly + cycle protection, and **pagination/filter helpers** — page math (`total_pages`, `has_next/prev`), `page_size` cap enforcement, `sort_by` whitelist rejecting unknown columns, date-range and search builders.
- **DB:** run `supabase/migrations/*` in the Supabase SQL editor; confirm seeded breeds, indexes, storage bucket.
- **API:** `uvicorn app.main:app --reload`; exercise `/docs`; smoke script that creates breeds → goats → a crossing → registers kids (manual DOB) → links parents → asserts `/goats/{id}/pedigree` auto-built; seeds ~50 goats and ~60 expenses to verify **paging, filter combinations, sorting, and that expense `summary` totals reflect the full filtered set, not just the page**.
- **Frontend:** `npm run dev`; log in, add goats as **bred and purchased** (verify auto IDs + placeholder image), record a crossing, watch the countdown, enter a manual actual kidding date + kids, register and **link kids to mother & father**, confirm `/pedigree` grew, log a vaccination, mark a goat expired and confirm it leaves active lists/pickers but keeps its history, add expenses and check monthly history + settle-up. Exercise **filters, search, sorting and paging on every list, confirm they persist in the URL across refresh and back-navigation**. Check every page at 375px and desktop.
- **End-to-end** requires the user's Supabase keys in `.env` / `.env.local` (documented in README). Backend tests + `npm run build` will be run to prove everything compiles before pushing.

## Assumptions
- Sex captured as male/female per goat (required for sire/dam roles & pedigree).
- Pedigree placeholder shows the descendant goat's breed name; linking the real parent replaces it.
- Parent linking works for any goat (bred or purchased), provided the parents exist in the portal.
- Currency defaults to PKR (₨), configurable.
- Default page size 20 (max 100); goats list defaults to `status=active`.
