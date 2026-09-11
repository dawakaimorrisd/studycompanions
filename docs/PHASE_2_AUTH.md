# Phase 2 — Auth

Builds the one screen every user hits first: `/login`.

## What was built

- **`src/lib/api/auth.ts`** — `fetchColleges`, `instructorLogin`,
  `studentLogin`, `studentSignup`. All called unauthenticated (no token
  exists yet at this point in the flow).
- **Shared form primitives** — `Button`, `TextField`, `SelectField`,
  `SegmentedToggle`, `FormError`. Small on purpose: Phases 3–5 reuse every
  one of these instead of each screen inventing its own inputs.
- **`/login` fully built out:**
  - A Student/Instructor role toggle. Student gets a second Log in/Sign up
    toggle underneath; Instructor doesn't, since there's no instructor
    signup path.
  - **Instructor:** Name + Password. Failure is shown as one generic
    message regardless of which field was wrong — the backend already
    withholds that distinction, and the UI doesn't try to guess it back.
  - **Student login:** Student Code + Password.
  - **Student signup:** Name, Student Code, Password, and a College
    dropdown. The dropdown lazy-loads from `GET /api/v1/colleges` only
    once signup is opened (not on every visit to `/login`), and has its
    own retry-able error state independent of the rest of the form.
  - **`conflict` on signup** (student code already taken) surfaces inline
    with a "Log in instead" action that switches tabs and carries the
    code over, instead of leaving the student stuck on a dead-end error.
  - **`rate_limited`** shows the backend's own human-readable retry
    message verbatim — no attempt to re-derive or reformat it.
  - On success, the session is set and the user is routed to `/student`
    or `/instructor`. Anyone already authenticated who lands on `/login`
    is bounced straight to their home screen instead of seeing the form.

## Verified

- `npm run check` — clean
- `npm run build` — succeeds
