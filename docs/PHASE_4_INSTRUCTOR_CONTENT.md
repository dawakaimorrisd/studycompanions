# Phase 4 — Instructor content management

The instructor side's core loop: see your courses, see what's uploaded,
upload something new.

## What was built

- **`src/lib/api/instructor.ts`** — course list, course content, and the
  multipart note upload call.
- **`src/lib/stores/instructor-courses.svelte.ts`** — caches the
  instructor's course list after the first fetch. This exists because the
  course-content endpoint only returns a list of notes, not the course's
  own name/code — so the course-detail page's header needed a way to know
  the course name without a redundant fetch on every single navigation.
- **My Courses** (`/instructor`) — list of the instructor's courses, with
  an explicit empty state for an instructor who hasn't been assigned one
  yet (rather than a bare blank page).
- **Course detail** (`/instructor/courses/:id`) — the note list for that
  course, a "Pending" badge when `generatedAt` is null, and an Upload
  Note entry point.
- **Upload Note** (`/instructor/courses/:id/upload`) — a deliberate
  two-step flow:
  1. **Form:** optional title, a paste-text/upload-file toggle (client-
     validated so exactly one of the two is ever sent — never both, never
     neither), and the corresponding input.
  2. **Confirm:** a summary of what's about to be uploaded plus an
     explicit statement that it can't be edited afterward. Only on
     confirming does the actual `POST` fire.
  On success, the student — sorry, the *instructor* — lands on the new
  note's read-only view, not back on an editable draft. There's no edit
  affordance anywhere in this flow, intentionally.
- **Read-only note viewer**
  (`/instructor/courses/:id/notes/:id`) — reuses the exact same
  `ContentReader`/`QATab`/`DictionaryTab` component tree from Phase 3.
  The only difference is what's *not* called: no open-marking, no
  study-session tracking. An instructor reviewing their own upload isn't
  "studying" it.

## Verified

- `npm run check` — clean
- `npm run build` — succeeds
- Confirmed no edit/delete affordance exists anywhere in this flow
