# Phase 6 — Polish & QA

The cross-cutting pass, done last on purpose so it could look at the whole
app at once rather than screen-by-screen.

## What was built

- **`src/routes/+error.svelte`** — a styled fallback for 404s and
  unexpected errors. Worth calling out specifically because SSR is off
  app-wide (Phase 1's decision) — without a custom error page, a bad
  route would fall through to SvelteKit's bare default rather than
  something that matches the rest of the app.
- **Per-page `<title>` tags** — every top-level screen (login, student
  home, both readers, instructor home, course detail, upload, instructor
  note viewer, my students) sets its own browser-tab title instead of
  leaving it generic.
- **Responsive pass** — header, nav, and main-content padding tightened
  for narrow viewports (`px-4 sm:px-6`), long names/titles truncate
  instead of overflowing or wrapping awkwardly.
- **`README.md`** — rewritten from the SvelteKit scaffold default into an
  actual project README: setup steps, the env var that has to be set
  before anything works, project structure, and the notable engineering
  decisions made along the way (SSR-off, the sendBeacon deviation, the
  shared read-only reader).
- **`docs/`** — this folder: one write-up per phase, including this one.

## Final checklist against the handoff's "explicitly do not build" list

Checked directly against the code, not just from memory:

| Item | Status |
|---|---|
| Instructor signup | Confirmed absent — grepped for any `instructors/signup` reference, found none |
| Assignment UI for Instructor | Confirmed absent — no `assignment`-named route exists anywhere under `/instructor` |
| Edit/delete UI anywhere | Confirmed absent — grepped for edit/delete language across every route; the only hit is the upload confirm screen's own warning that editing *isn't* possible |
| Course/college/staff management | Not built |
| Cross-course student visibility for Instructor | Not applicable — `getMyStudents` returns exactly what the backend scopes to the instructor, no client-side filtering that could be bypassed |
| Password reset | Not built |

## Verified

- `npm run check` — clean
- `npm run build` — succeeds
