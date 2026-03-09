# OnSite Dashboard — Acueducto DN1600

Engineering dashboard for the 27km DN1600 MSCL pipeline project (Water Corporation, Perth WA).

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Recharts
- Supabase JS client

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase

Uses an **existing** Supabase project shared with OnSite(Drainer), OnSite(Backfill), and Water Cart App. Read-only; no schema changes.

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The app falls back to mock data if Supabase is unavailable, so the UI works without a DB connection during development.

## Page 1 — Daily View

- Header with project name, chainage, live indicator
- Nav tabs: Daily | Progress | Resources | Reports (inactive)
- Daily Progress — cumulative dual line chart (pipe + backfill)
- Water Consumption — donut chart by activity
- 5-day historic trend: Pipes/day and Backfill/day
