# Construction Site & Money System — Demo

A working demo of a management system for construction firms: sites, stage progress,
material and labour spend, attendance and wages, vendor bills, and customer payments,
all in one place.

**This is a demonstration build.** Every name, site and rupee figure in it is invented.
It is not connected to any real company's data.

---

## Run it

```bash
npm install
npm run dev
```

That is the whole setup. There is no database to create, no account to make, no API key
to paste in, and no internet connection required after `npm install`. It opens straight
onto the dashboard.

To produce a deployable build:

```bash
npm run build
```

## Why there is no backend

The demo runs entirely in the browser. `firebase/firestore`, `firebase/auth` and
`firebase/storage` are redirected in `vite.config.ts` to stand-ins in `src/demo/`, backed
by an in-memory store seeded from `src/demo/seed.ts`.

This is deliberate. It means the demo:

- works with no internet, which matters when showing it in someone's site office
- carries no credentials of any kind in the bundle
- resets to a clean, well-populated state on every page refresh — so a demo can never be
  left in a broken state by the last person who clicked around in it
- costs nothing to host and has no database to keep alive

Changes you make while clicking around behave exactly as they would in the real system —
saving a payment updates the totals on other screens live — they simply do not survive a
refresh.

## What it demonstrates

**Sites and progress**
- Multiple sites at once, each with its own stage plan and per-stage progress
- A schedule that calculates its own dates: activities have a duration and a list of what
  they wait for, and the system works out every start and finish. Change one duration and
  everything downstream moves.
- Critical path — the chain of work that decides the handover date, and how much slack
  every other activity has
- Gantt chart with dependency arrows, a today line, and month/week/day zoom
- Baselines: save a plan, then see "12 days late" against it, per activity and per stage

**Money**
- Material and labour spend recorded against a specific site
- Vendor bills and payables — what is owed, to whom, and what is overdue
- Customer payments against each project, with receipts
- One weekly settlement screen: everything owed right now, split into own workers, shops
  and contractors, with a warning for bills falling due within seven days
- Every figure on the finance dashboard opens into the records it was built from, so a
  number can always be traced back rather than taken on trust

**People**
- Daily attendance and wages for site staff, coolies and contractors
- Advances, and a running balance of what each person is still owed
- Supervisor logins with restricted access

**Paperwork**
- Leads and follow-ups, quotations, and agreements with versions
- PDF generation for quotations, agreements and receipts

It works on a phone as well as a desktop, which is where a site supervisor actually
uses it.

## Layout

```
src/
  demo/        the in-browser stand-in for Firebase (demo only)
  lib/         shared logic — schedule calculation, money rollups, safe writes
  pages/       one folder per area of the system
  store/       state, one per area
api/           a serverless function used for translation
```

## Notes for whoever works on this next

- `src/demo/` and `src/lib/firebase.ts` exist only in this build. Do not replace them with
  the real Firebase versions.
- The scheduling feature (`src/lib/cpm.ts`, `src/pages/Projects/schedule/`,
  `src/store/scheduleStore.ts`) was built here and exists only here.
- `CLAUDE.md` in this folder carries the fuller working notes.
