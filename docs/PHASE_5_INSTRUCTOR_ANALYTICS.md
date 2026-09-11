# Phase 5 — Instructor analytics

The "how are my students actually doing" view.

## What was built

- **`getMyStudents`** added to `src/lib/api/instructor.ts` — returns
  students combined across *all* of the instructor's courses, not
  grouped or filterable per-course (matching the handoff's explicit
  scope: no cross-course visibility controls to build, no per-course
  breakdown needed here).
- **`src/lib/format.ts`** — `formatDuration` (seconds → `"2h 15m"` /
  `"45m"` / `"30s"`) and `formatShortDate`, shared wherever a duration or
  date needs to read as something a human would actually say.
- **`WeeklyActivityChart`** — a small Sunday-through-Saturday bar chart
  built from `weeklyActivityByDay`, no charting library needed for
  something this simple.
- **`StudentSummaryCard`** — per student: name, student code, an
  engagement badge (green/amber/red for engaged/moderate/at-risk), total
  study time, last-studied date (or "Never" if they haven't started),
  most-studied content with its duration, and the weekly chart.
- **`InstructorNav`** — a My Courses / My Students switcher, added to the
  top of both top-level instructor screens so the two views feel like
  parts of one app rather than two disconnected pages.
- **My Students** (`/instructor/students`) — a responsive card grid, with
  its own loading/error/empty states following the same pattern as every
  other list screen in the app.

## Verified

- `npm run check` — clean
- `npm run build` — succeeds
