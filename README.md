# Goat Farm Portal

Herd management for a working goat farm — goats, crossings and kidding, an
auto-building pedigree, vaccination and health logs, and a shared expense ledger
with 50/50 settle-up.

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript), Tailwind, Framer Motion, TanStack Query, Recharts |
| Backend | FastAPI, SQLAlchemy 2.0 async, Pydantic v2 |
| Database | Supabase Postgres + Storage |

The Next.js app talks to the FastAPI backend for all data, including signing
in — the API mints its own session tokens. Supabase is used directly for
exactly one thing: uploading goat photos to Storage.

---

## What it does

- **Goats** — full CRUD with auto-generated, locked tag numbers (`BGF-MC-01`),
  counting separately per breed. Bred here or purchased from market. Optional
  photo with a friendly placeholder.
- **Crossings** — which doe was crossed with which buck, on what date. The
  expected kidding date is estimated at +150 days with a live countdown; the
  **actual** kidding date is entered by hand and may differ.
- **Pedigree** — nothing is drawn by hand. Link a kid to its mother and father
  and the tree grows on its own. Unknown ancestors show the breed name.
- **Goat 360** — click any goat to get its whole life in one page: parents,
  kids, every crossing, vaccinations, weights, health records, linked expenses,
  and a single merged activity timeline.
- **Expenses** — date, name, cost and who paid (taken from whoever is signed
  in), split 50/50, with monthly history and a **Settle up** action that drives
  the balance to zero.
- **Expired goats** — a goat that dies is marked expired. It keeps its history
  and stays in the pedigree, but drops out of active lists and pickers.

---

## Setup

### 1. Database

Create a Supabase project, then run the migrations **in order** in the SQL
editor (Supabase dashboard → SQL Editor → New query):

```
supabase/migrations/0001_init.sql        tables, enums, triggers
supabase/migrations/0002_indexes_rls.sql indexes, tag allocation
supabase/migrations/0003_seed.sql        breeds, storage bucket, portal users
```

`0003_seed.sql` seeds the three breeds (Makhi Cheeni `MC`, Teddy `TD`, Rajan
Puri `RP`), creates the `goat-photos` storage bucket, and adds the portal's
users. **There is no signup screen** — before running it the first time, edit
the `insert into users (...)` block at the bottom with real emails, names and
passwords (whatever you leave there is what you type in at `/login`). To add
a third partner later, add another row to that block and re-run the file —
it upserts by email, so re-running is always safe.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # paste your DATABASE_URL, generate a JWT_SECRET
.venv/bin/uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs, liveness at `/healthz`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL, and Supabase keys for photo upload
npm run dev
```

http://localhost:3000

---

## Configuration

Everything lives in `backend/.env` (see `.env.example` for the full list):

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | Supabase Postgres, `postgresql+asyncpg://…` |
| `JWT_SECRET` | — | Signs the API's own session tokens; never share it |
| `JWT_EXPIRE_DAYS` | `60` | How long a login lasts before signing in again |
| `FARM_PREFIX` | `BGF` | The first segment of every tag number |
| `GESTATION_DAYS` | `150` | Drives the expected kidding date |
| `CURRENCY_CODE` / `CURRENCY_SYMBOL` | `PKR` / `₨` | |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated |

---

## Checks

```bash
cd backend
.venv/bin/python -m pytest      # no database or network needed
.venv/bin/python -m ruff check app tests

cd ../frontend
npm run typecheck
npm run lint
npm run build
```

The backend suite covers tag format and per-breed sequencing, gestation and
countdown maths, the cent-exact 50/50 split and settle-up, pedigree assembly and
cycle protection, the shared pagination and filter contract, and the auth gate
(including that `/auth/login` is the one data route reachable without a token).
The frontend build runs without any Supabase keys present — pages that need data
render their empty and setup states.

---

## API shape

Every list endpoint speaks the same query grammar — `page`, `page_size` (max
100), `sort_by`, `sort_dir`, `q`, plus that resource's own filters — and returns
the same envelope:

```json
{ "items": [], "page": 1, "page_size": 20, "total": 137,
  "total_pages": 7, "has_next": true, "has_prev": false }
```

Expense lists add a `summary` block whose totals cover the **whole filtered
set**, not just the current page.

Beyond CRUD: `POST /auth/login` (the only unauthenticated data route),
`GET /dashboard/summary`, `GET /goats/{id}/history` (the 360 view in one
request), `GET /goats/{id}/pedigree`, `POST /goats/{id}/link-parents`,
`POST /goats/{id}/expire`, `POST /crossings/{id}/kidding`,
`GET /expenses/balance`, `GET /expenses/monthly`, `POST /expenses/settle`.

---

## Layout

```
backend/     FastAPI — routers, services, core (pagination + filters), tests
frontend/    Next.js app
supabase/    SQL migrations and seed
docs/PLAN.md the full build plan
```
