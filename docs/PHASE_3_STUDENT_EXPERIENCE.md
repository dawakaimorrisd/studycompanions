# Phase 3 — Student experience

The core of what a student actually uses: their content list and the
reader itself.

## What was built

- **`src/lib/api/content.ts`** — student home list, note/assignment
  fetch, open-marking calls.
- **`src/lib/markdown-table.ts`** — a small hand-written GFM pipe-table
  parser. Not a full markdown library — `answer` only ever contains a
  pipe-table when `isTable` is true, so that's the only construct this
  needs to handle. Falls back to plain text if something doesn't parse
  cleanly, rather than rendering a broken table.
- **`src/lib/study-session.ts`** — the active-study-time tracker (see the
  dedicated write-up below).
- **Student home** (`/student`) — Notes and Assignments sections pulled
  from `/students/me/content`, a "New" badge on `openedAt: null`, a "Not
  yet ready to study" badge on `generated: false`, and a real empty state
  when both lists come back empty.
- **Readers** (`/student/notes/:id`, `/student/assignments/:id`) — built
  around a shared `ContentReader` tab shell (Read/Sections, Q&A,
  Dictionary):
  - Q&A is chunked into pages of 5 questions, with explanation and
    example shown by default under each answer (not hidden behind a
    "show more" — the handoff notes they're populated on most units, so
    absence is the exception, not the rule).
  - Dictionary flattens and deduplicates glossary terms across every
    question unit in the note, sorted alphabetically.
  - Q&A/Dictionary show a distinct "hasn't finished preparing this yet"
    state when `generatedAt` is null — the Read/Sections tab stays
    available regardless, since raw text doesn't depend on generation.
  - Open-marking (`POST .../open`) fires unconditionally on load,
    fire-and-forget, exactly as specified — not gated on which tab the
    student lands on.

## Decision: study-session logging uses `fetch` + `keepalive`, not `sendBeacon`

The handoff suggests `navigator.sendBeacon` for the page-unload case.
This uses `fetch` with `{ keepalive: true }` instead, for one specific
reason: **`sendBeacon` cannot set an `Authorization` header**, and every
route on this API — including `POST /api/v1/study-sessions` — requires a
bearer token. A literal `sendBeacon` implementation would have to either
send the request unauthenticated (which the backend would reject) or
smuggle the token into a URL query string (which leaks it into server
logs). `fetch` with `keepalive: true` gets the same "survives the page
closing" guarantee `sendBeacon` exists for, while still sending the
header correctly.

Time is tracked only while the student is on the Q&A or Dictionary tab —
reading the raw text alone isn't counted, per the handoff's own framing
of that as a judgment call it left to the frontend. The tracker flushes
(sends what's accumulated, resets to zero) on tab-hidden, on `pagehide`,
and on component teardown — not just once at the very end — so a long
session logs as a handful of smaller rows instead of betting everything
on one request racing the page's unload.

## Verified

- `npm run check` — clean
- `npm run build` — succeeds
