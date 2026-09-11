# Study Companion — Frontend

A web app for students and instructors, built on top of an existing
SvelteKit/Prisma backend (see `FRONTEND_HANDOFF.md` for the original spec).
Students get a reading/study experience for the Notes and Assignments their
instructors send them, with the option to download content and keep
studying offline; instructors get a place to upload material and see how
their students are doing. It's also installable as a PWA.

## Quick start

```sh
npm install
cp .env.example .env   # then open .env and set PUBLIC_API_BASE_URL
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`) and you're in —
log in as a student or instructor, or sign up as a new student.

**One thing that has to be true for anything to work:** `PUBLIC_API_BASE_URL`
must point at a backend that has *this app's* origin registered in its own
`FRONTEND_ORIGIN` setting. If it isn't, requests fail as a silent CORS block
— you'll see a clear "could not reach the server" message rather than
nothing, but it's worth knowing that's almost always the cause.

Other useful commands:

```sh
npm run check    # type-check the whole project
npm run build    # production build
npm run preview  # serve that production build locally
```

Before deploying anywhere, pick a real
[adapter](https://svelte.dev/docs/kit/adapters) — the project currently ships
with `@sveltejs/adapter-auto`, which is a placeholder that doesn't target a
specific platform.

## What's here

- **Login** (`/login`) — student or instructor, with student log in / sign up
- **Student home** (`/student`) — everything an instructor has sent, split into Notes and Assignments
- **Note & Assignment readers** — Read/Sections, a Dictionary tab, and a gated multiple-choice tab: a chapter Test for Notes (instructor-controlled, one attempt, batch reveal) or a self-paced Drill for Assignments (student-controlled, repeatable, reveals immediately) — with study time tracked automatically throughout
- **Offline downloads** — students can download any Note or Assignment for offline study; the app itself is installable and its shell loads with no connection at all
- **Instructor home** (`/instructor`) — the instructor's courses
- **Course detail** — notes in that course (with chapter labels and test status), plus a two-step Upload Note flow and Start/Reveal Test controls
- **My Students** (`/instructor/students`) — per-student engagement, study time, weekly activity chart, and chapter test scores

## Stack

SvelteKit (Svelte 5, runes) + TypeScript + Tailwind v4. There's no
cookie-based auth — the backend issues a bearer token, which this app stores
client-side and sends as `Authorization: Bearer <token>`. Because of that,
**SSR is disabled app-wide** (`src/routes/+layout.ts`): the server has no way
to know who's logged in on the very first request, so this runs as a
client-rendered app throughout.

## Project structure

```
src/lib/
  types.ts              Every data shape from the handoff, single source of truth
  api/
    client.ts            Core fetch wrapper: auth header, error-code parsing,
                          global not_authenticated -> redirect handling
    auth.ts               Login/signup/colleges
    content.ts             Student home + note/assignment fetch + open-marking
    instructor.ts           Instructor courses/content/upload/students
  stores/
    session.svelte.ts     Bearer-token session, persisted to localStorage
    toasts.svelte.ts       Toast queue
    instructor-courses.svelte.ts  Cached course list (shared by home + course detail header)
  study-session.ts        Active-time tracker for the student reader
  offline/
    db.ts                  IndexedDB schema (downloads + offline write queues)
    downloads.svelte.ts     Student-facing download store
    network.svelte.ts        Reactive online/offline flag
    sync.ts                   Retries queued study-sessions/opens once back online
  components/
    reader/                 ContentReader shell, McqQuestion, PaginatedQuestions,
                             NoteTestPanel, AssignmentDrillPanel, DictionaryTab
    (everything else)       Shared UI primitives

src/routes/
  login/                  Role toggle, student log in / sign up
  student/                Home, note reader, assignment reader
  instructor/             Home, students dashboard, course detail (incl. Start/Reveal Test), upload

src/service-worker.ts    Precaches the app shell for offline loading
static/manifest.webmanifest, static/icons/   PWA installability
```

## How this was built

This was built in six phases, each one shipped and verified (`npm run
check` + `npm run build`) before moving to the next. Every phase has its own
write-up in [`docs/`](./docs) — what was built, and why, in more detail than
fits here:

1. [Foundations](./docs/PHASE_1_FOUNDATIONS.md) — scaffold, API client, session store, route guards
2. [Auth](./docs/PHASE_2_AUTH.md) — the login screen
3. [Student experience](./docs/PHASE_3_STUDENT_EXPERIENCE.md) — home + readers + study-session tracking
4. [Instructor content management](./docs/PHASE_4_INSTRUCTOR_CONTENT.md) — courses, upload, read-only viewer
5. [Instructor analytics](./docs/PHASE_5_INSTRUCTOR_ANALYTICS.md) — My Students dashboard
6. [Polish & QA](./docs/PHASE_6_POLISH_QA.md) — error page, responsiveness, final checklist

Offline support and PWA installability were added afterward, at the
student's request — see [`docs/OFFLINE_PWA.md`](./docs/OFFLINE_PWA.md) for
what that involved and, notably, why it's built on SvelteKit's native
service worker support rather than a third-party PWA plugin.

**Phase 7** rebuilt the reader around the backend's MCQ pivot — chapter
tests for Notes, self-paced drills for Assignments. See
[`docs/PHASE_7_MCQ_TESTS_DRILLS.md`](./docs/PHASE_7_MCQ_TESTS_DRILLS.md)
for the full shape of that change, including the wire-format assumptions
made where the backend doc didn't pin something down.

## Notable decisions

- **Study-session logging uses `fetch` with `{ keepalive: true }`, not
  `navigator.sendBeacon`.** The handoff suggests sendBeacon for reliability
  during page unload, but sendBeacon can't set an `Authorization` header,
  and every route on this API requires a bearer token. `fetch` + `keepalive`
  gets the same "survives unload" property while still authenticating
  correctly. Full reasoning in [Phase 3's write-up](./docs/PHASE_3_STUDENT_EXPERIENCE.md).
- Active study time is tracked only while the student is on the Q&A or
  Dictionary tab (reading raw text alone isn't counted) and flushed in
  chunks — on tab-hidden, page-hide, and component teardown — rather than
  betting everything on one request at the very end.
- The instructor never gets a note-reading view of any kind - upload,
  watch student progress, and start/end the chapter test are the whole
  job. `ContentReader`/`McqQuestion`/`PaginatedQuestions`/the dictionary
  and question tabs are exclusively student-side code.
- Note upload is a deliberate two-step flow (fill in → confirm) since
  uploads can't be edited afterward — there's no draft state to fall back
  into.
- **Offline downloads use IndexedDB, not opportunistic HTTP caching**, and
  the service worker deliberately never caches API responses. A student's
  offline content is exactly what they explicitly downloaded — nothing
  more, nothing stale from a background cache they didn't know was there.
  Full reasoning in [`docs/OFFLINE_PWA.md`](./docs/OFFLINE_PWA.md).
- **Chapter tests and drills are two separate, deliberately unshared
  components** (`NoteTestPanel` vs. `AssignmentDrillPanel`), even though
  both are "answer MCQs, then see what's revealed" on the surface — because
  *who controls the gate* (instructor, batch reveal vs. student, immediate
  reveal, repeatable) is the entire point of keeping them apart. Test/drill
  submissions are never queued for offline retry the way study-session logs
  are — a one-shot, database-constrained action needs the student to know
  it actually landed. Full reasoning in
  [`docs/PHASE_7_MCQ_TESTS_DRILLS.md`](./docs/PHASE_7_MCQ_TESTS_DRILLS.md).

## Explicitly out of scope

Per the handoff: Instructor signup, any Assignment UI for Instructors, edit
UI for Instructor uploads, course/college/staff management, cross-course
student visibility, and password reset. Confirmed absent from the codebase
as part of [Phase 6's checklist](./docs/PHASE_6_POLISH_QA.md).
