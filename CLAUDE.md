# demo-builder — sales demo

**Not a client project. Not deployed to any client. No backend.**

**Repo:** https://github.com/Ashgamedev/demo-build--Construction (branch `main`).
This folder is a git repo in its own right - it is deliberately NOT a branch of the client
project, so a demo can never be deployed to a client or reach client data.

### What is deliberately NOT in the repo

`website/` is gitignored. It is a copied-in Next.js public site that nothing in `src/`
imports, the demo builds and runs without it, it is ~900MB, and - the real reason -
`website/.env.local` inside it holds a **live Firebase Admin private key for the client's
real project.** That has no business sitting in a demo repo.

So the claim below that "this build needs no credentials" is true of the demo app, but it is
not true of this folder on disk. If you are ever asked to force-add a file here, or to widen
the ignore rules, stop and check what you are about to publish.

A sales copy of `Deepthi Construction`, used to show builders and construction firms what a
site-and-money system looks like — material spend per site, labour attendance, customer
payments, stage progress.

## How this build differs from the client build

There is **no Firebase**. `firebase/firestore`, `firebase/auth` and `firebase/storage` are
aliased in `vite.config.ts` (and `tsconfig.json` paths) to stand-ins in `src/demo/`, backed by
an in-memory store seeded on load from `src/demo/seed.ts`.

Only `src/lib/firebase.ts`, the alias config, and the new `src/demo/` folder differ. No store,
page or component was modified.

The client build reads `VITE_FIREBASE_*` env vars, so **no credentials were ever hardcoded** —
the copied `.env` was deleted, and this build needs none.

Same reasoning as `demo-hvac`: works offline at a door, no credentials in the bundle, every
refresh restores a clean demo state, and no Firebase project to create or pay for.

Signs in as the company owner automatically, so it opens on the dashboard.

## This shim is the fuller one

Unlike `demo-hvac`, this app is built on realtime stores, so the shim here adds:

- **`onSnapshot`** — fires immediately, then again on any write to that collection, via a
  watcher set in `src/demo/store.ts`. This is what makes a change in one screen appear in
  another without a reload, exactly as the client build behaves.
- **`runTransaction`** — runs the body straight against the store. There is no concurrency in
  a single tab against an in-memory map, so no retry loop is needed.
- **`connectFirestoreEmulator` / `connectAuthEmulator` / `connectStorageEmulator`** — no-ops.
- **`signInAnonymously`** — the client build uses it for dev auto-login.

If `demo-hvac` ever needs realtime, copy the shim from here rather than rewriting it.

## Rules

- **Never put real client data in here.** Everything in `seed.ts` is invented — customers,
  sites, workers, vendors, rupee figures. Invent more rather than copying anything real.
- Changes flow **source → demo, never demo → source.**
- Dates are computed from `Date.now()`, so sites, attendance and bills always look current.
  Keep it that way — don't replace with fixed dates.

## What the seed contains

Four sites (three live, one delayed) with five-stage plans; four customers; six workers on
salary and daily wage; four material vendors; three weeks of attendance; material and labour
spend attributed per site and vendor; customer payments against each project; four open leads.

Built around the demo's core moment: **"how much cement went to site 3 this week"** should be
answerable in seconds.

Vendor bills are seeded separately into `vendor_bills` (note the underscore — the app's
Purchases page reads that, not `expenses`). Without them the Purchases screen is empty, which
is a weak moment mid-demo.

## Verified working

Dashboard (₹72L collected / ₹66.9L pending), Projects list with four sites and progress,
Finance dashboard with cash position and recent payments/expenses, Purchases & Payables with
unpaid, partial, paid and one overdue bill. `npx vite build` clean.

`npx tsc --noEmit` reports errors, but **the source project reports 23 of its own** — most are
pre-existing unused-variable warnings, not shim problems. Don't chase them.

One real bug found and fixed while wiring this up: `setDoc(ref, data, { merge: true })` is used
in `agreementStore` and `attendanceStore`. A shim that ignores the third argument silently
replaces the document and drops fields. It is handled — keep it that way.

## Capabilities

What this demo can show a buyer, in the words they would use.

- **Project schedule with calculated dates.** Activities have a duration and a
  list of what they wait for; the system works out every start and finish date.
  Change one duration and everything downstream moves.
- **Critical path.** Shows the chain of work that decides the handover date, and
  how many days of slack every other activity has.
- **Gantt chart** with dependency arrows, a today line, month/week/day zoom, and
  milestone markers.
- **Plan vs actual.** Save a baseline, then see "12 days late" against it, per
  activity and per stage, with a recorded reason for the delay.
- **Stages roll up from the schedule** — stage dates, progress, slack and
  slippage are all computed, not typed in.

Mirrored in from the live client system on 22 Aug 2026 — all of it is buyer-visible:

- **Weekly settlement screen.** Everything owed right now in one place, split into
  our people, shops and contractors, with a warning for bills due in 7 days.
  This is the screen that answers "who do I pay on Saturday".
- **Every finance figure opens up.** Tap a number on the dashboard and see the
  records it was built from. Good demo moment — it answers "where did that come from".
- **Works on a phone.** Worth showing on your own phone at the door; the tools
  these firms compare against are desktop-only in practice.
- **New logo** throughout, including the login screen and the PDF letterhead.

### Why this exists — read before changing it

Built after a prospect who uses **Primavera P6** dismissed the old Stages tab as
"basic". It was: a checklist with hand-typed dates that calculated nothing.

The pitch is NOT "we replace Primavera". It is that **Primavera has no answer for
money** — it does not know the vendor bill, the coolie wages or what the customer
actually paid, and those live in Excel at every firm around here. This demo puts a
credible schedule and the finance in one system. The finance section is the part
that prospect already liked.

Also confirmed while researching: **P6 has no inventory or stock tracking** (it has
resource loading against activities, which is a different thing). That is open
ground if a buyer asks.

Design note: the layout follows scheduling-software convention on purpose — table
left, timeline right, critical path in a hot colour — because that is why it is
readable without explanation. Gantt charts and CPM are both long out of patent.
The styling, palette and typography are ours; nothing is taken from Oracle's
visual assets, and their name is not used anywhere in the UI.

Schedule maths lives in `src/lib/cpm.ts` and is covered by `src/lib/cpm.test.ts`
(17 tests — run `npx vitest run src/lib/cpm.test.ts`). If you change the engine,
run them.
