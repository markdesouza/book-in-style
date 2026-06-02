# Book in Style — Salon Manager

A web app for managing a hair-dressing salon: appointments, customers, and a
live news feed. Built with **Next.js**, **shadcn/ui**, and **Turso / libSQL**.

## Features

- **Responsive calendar** — week view on desktop, one-day-at-a-time on mobile.
- **Customers** — name, phone, email, birthday, and a default appointment
  length (20–120 min in 5-minute steps).
- **Appointments** — date/time, length, customer, notes, and a "moved" flag set
  automatically when an appointment is rescheduled (the original time is kept).
- **Click to edit** — tap an appointment to change its length/notes or to
  cancel / undo-cancel it.
- **Overlapping bookings** — concurrent appointments are laid out side-by-side
  in lanes instead of stacking.
- **Show / hide cancelled** — a toggle in the header.
- **Drag to reschedule** — drag an appointment to a new time (and, on desktop, a
  new day). Snaps to 5-minute increments and works with touch.
- **News feed** — new bookings, change requests, reschedules, and cancellations,
  each markable as seen.

## Requirements

> **Node 18.18+ is required** (this repo is developed on Node 22). If your
> default `node` is older, switch with nvm:
>
> ```bash
> nvm use 22   # or: nvm install 22
> ```

## Getting started

```bash
npm install
npm run db:push   # create the SQLite schema (local.db) — see "Database" below
npm run db:seed   # optional: load demo customers, appointments, and news
npm run dev       # http://localhost:3000
```

## Database

By default the app uses a local SQLite file (`local.db`) via libSQL, so it runs
with **zero external setup**. To use a hosted [Turso](https://turso.tech)
database instead, set these in `.env.local`:

```bash
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token"
```

Then re-run `npm run db:push` (and optionally `npm run db:seed`).

### Scripts

| Script              | Description                             |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start the dev server                    |
| `npm run build`     | Production build                        |
| `npm run db:push`   | Push the Drizzle schema to the database |
| `npm run db:seed`   | Reset and load demo data                |
| `npm run db:studio` | Open Drizzle Studio to browse the data  |

## Project layout

```
src/
  app/
    page.tsx            # server component: loads the week's data
    actions.ts          # server actions (create/update/reschedule/cancel/news)
    layout.tsx
  components/
    salon-app.tsx       # top-level client shell: header, nav, view state
    calendar-grid.tsx   # the calendar, overlap layout, and drag-to-reschedule
    appointment-dialog.tsx   # edit / cancel an appointment
    new-appointment-dialog.tsx
    news-feed.tsx
    ui/                 # shadcn/ui components
  db/
    schema.ts           # Drizzle schema (customers, appointments, news_events)
    index.ts            # libSQL/Turso client
    seed.ts             # demo data
  lib/
    salon.ts            # time/layout helpers + overlap algorithm
    queries.ts          # server-side data fetching
```
