# Phase 7 (frontend) — Chapter Tests & Self-Paced Drills

Matches the backend's own **Phase 9** doc (`QuestionUnit` MCQ pivot,
chapter tests for Notes, self-paced drills for Assignments). Numbered
Phase 7 here because it's the seventh piece of frontend work, following
the original six phases plus the offline/PWA addition - the numbering
doesn't need to line up with the backend's.

## The core shift

`QuestionUnit` went from free-text Q&A to multiple choice everywhere at
once - `answer`/`isTable` are gone, replaced by `optionA`–`optionD` and
`correctOption`. `example` moved off `QuestionUnit` onto `DictionaryEntry`.
This is why Phase 3's old `QATab.svelte`, `QuestionCard.svelte`, and the
whole markdown-table parser (`markdown-table.ts`, `MarkdownTable.svelte`)
were deleted outright rather than kept alongside the new model - there
was no free-text answer left for them to render.

**Gating is the second, orthogonal shift.** `correctOption`/`explanation`
come back `null` from the API for a student until the relevant test/drill
is revealed. An Instructor viewing their own course always sees
everything ungated. This means the second reader tab isn't a static list
anymore - it's a small state machine per content type.

## Two gates, two components, deliberately not shared

Matching the backend doc's own insistence that these stay independent
models (`NoteTestAttempt` vs. `AssignmentDrillAttempt`), the frontend
keeps them as two separate panels rather than one generalized "gated
quiz" component:

- **`NoteTestPanel.svelte`** (Notes' second tab, now labeled "Test") -
  instructor-controlled. Four states, driven entirely by `note.test`:
  not started (browse only, no submit) → in progress (select + one-shot
  submit) → submitted, awaiting reveal → revealed (score + full review).
- **`AssignmentDrillPanel.svelte`** (Assignments' second tab, now labeled
  "Drill") - student-controlled. Repeatable: start → select + submit →
  immediate full reveal in the submit response itself → "Start a New
  Drill" re-hides everything, matching the backend's explicit "reveal
  tracks the most recent attempt only" rule.

Both are built on two shared, mode-agnostic pieces:
- **`McqQuestion.svelte`** - a single question in `locked` (browse,
  no interaction), `select` (interactive, bindable), or `review`
  (correct option highlighted, explanation shown, and the student's own
  wrong pick flagged when that data is available) mode. Note review
  never has a "your answer" flag - the handoff doc confirms `myAttempt`
  only ever carries `submittedAt`/`score`/`totalQuestions`, no
  per-question breakdown - so `NoteTestPanel` shows the correct answer
  per question but not which one the student chose. A drill's review
  *does* show this, since the submit response returns each answer's
  `selectedOption` directly.
- **`PaginatedQuestions.svelte`** - the 5-per-page chunking from Phase 3's
  old `QATab`, now mode-agnostic and reused by both panels.

`ContentReader.svelte` no longer owns the second tab's content at all -
it now takes a `qaContent` snippet (same pattern as the existing
`readContent` snippet) and a `qaTabLabel` string, so each reader page
supplies whichever panel fits. `ContentReader`, `McqQuestion`,
`PaginatedQuestions`, `NoteTestPanel`, `AssignmentDrillPanel`, and
`DictionaryTab` are exclusively student-side code - see the bug-fix pass
below for why the instructor never gets a version of this reader at all.

## Verified against the authoritative frontend handoff

An updated, authoritative "Frontend Handoff — Phase 9 Changes" doc arrived
after this was first built from the backend's own internal Phase 9 doc.
Diffing against it caught three real gaps, all fixed:

- **`isTable` is still present on the wire** (vestigial from the old
  free-text model, always `false`) - `QuestionUnit` had dropped it
  entirely; added back for shape accuracy even though nothing renders it.
- **`NoteTestStatus.myAttempt` needed a `totalQuestions` field**, and is
  `undefined` for an Instructor's own request (not just logically
  inapplicable) - `myAttempt` is now optional (`myAttempt?: {...} | null`),
  and `NoteTestPanel`'s revealed state now reads
  `myAttempt.totalQuestions` directly instead of inferring it from the
  question list length, since that's what the API actually hands back.
- **`drill/submit`'s response has a `finished: true` field** -
  `DrillSubmitResult` was missing it.

Everything else - the `test`/`drill`/`chapterTests` shapes, both submit
request bodies, the drill start/submit responses, the home-list summary
shapes (confirmed: no `totalQuestions` on either the Note or Assignment
home-list entry, matching what was originally guessed) - matched what had
already been built without changes.

## Everything else touched

- **`types.ts`** - full rewrite of the Notes/Assignments/QuestionUnit
  section; `NoteContent` and `AssignmentContent` no longer share an
  `extends` relationship (they diverged too much to stay one shape:
  `chapterLabel`/`test` only make sense for Notes, `drills` only for
  Assignments). New `StudentNoteSummary`/`StudentAssignmentSummary`
  replace the old shared `StudentContentSummary` for the same reason.
- **`lib/api/content.ts`** - `submitNoteTest`, `startAssignmentDrill`,
  `submitAssignmentDrill`.
- **`lib/api/instructor.ts`** - `startNoteTest`, `revealNoteTest`;
  `uploadNote` now accepts `chapterLabel`.
- **Instructor course detail list** - chapter label, a test-status badge
  (Not started / In progress / Revealed), and inline Start Test / Reveal
  Test buttons directly on each note row - the one narrow,
  explicitly-flagged-in-the-backend-doc exception to Instructor's
  otherwise upload-only role. There is no dedicated note-viewing page on
  the instructor side; see the bug-fix pass below for why.
- **Instructor "My Students"** - `StudentSummaryCard` gained a Chapter
  Tests section (revealed attempts only, per the backend's own
  withholding rule), additive alongside the existing engagement badge -
  never blended into it, matching the dean's "are they opening the
  material, **and** are they passing the tests" framing directly.
- **Upload Note** - an optional Chapter label field, shown back on the
  confirm screen like every other field there.
- **Student home list** - `ContentListItem` gained `chapterLabel` and
  `statusBadge` props; Notes show a test-status badge, Assignments show a
  drill-in-progress badge. The offline-downloads fallback (see
  `docs/OFFLINE_PWA.md`) produces these summary shapes too, just with
  test/drill fields reset to their empty state, since a downloaded
  snapshot can't carry live server-side status.
- **`DictionaryTab.svelte`** - renders `example` under each definition
  when present.

## A note on the offline story here

Test submission and drill start/submit are **not** queued for later sync
the way study-session logging and open-marking are (see
`docs/OFFLINE_PWA.md`). Those two are idempotent, best-effort telemetry -
replaying them late costs nothing. A test submission is a one-shot,
database-constrained action the student needs to know actually landed;
queuing it silently and hoping a later retry doesn't collide with, say,
the instructor having already revealed the test in the meantime is a
worse experience than just saying "you'll need to be online for this,"
which is what both panels do when `ApiError.networkFailure` is true.

## Verified

- `npm run check` - clean
- `npm run build` - succeeds
- Grepped the whole `src/` tree for any leftover reference to the retired
  free-text model (`.answer`, `QATab`, `QuestionCard`, `markdown-table`) -
  none found (`isTable` itself is intentionally still in the type, per
  the confirmed wire shape - just unused in any render path)
- Confirmed the PWA build artifacts (service worker, manifest) are
  unaffected and still emit correctly

## A real bug-fix pass, after reports that nothing was rendering

Everything above was built and type-checked against written specs, but
never run against a live backend from this environment - that gap showed
up as a real problem: reported blank Test/Drill tabs, and a note-viewing
page that had no business existing on the instructor side in the first
place. Two fixes came out of that report:

**1. Defensive fallbacks against API-shape mismatches.** Every response
was being cast with an unchecked generic (`api.get<NoteContent>(...)`) -
TypeScript trusts the annotation, it never validates the actual JSON. If
the live `test`, `drills`, `myAttempt`, `questionUnits`,
`dictionaryEntries`, or `course` field is shaped even slightly
differently than assumed (or briefly absent), the old code dereferenced
it directly and threw while rendering - which fails silently in a
production build, leaving that section blank with no visible error.
`NoteTestPanel`, `AssignmentDrillPanel`, `PaginatedQuestions`,
`DictionaryTab`, `StudentSummaryCard`, the instructor course list, and
both student reader pages now all fall back to sane defaults (empty
arrays, "not started" test status, blank course text) instead of
crashing. This doesn't guarantee the live shape matches what's assumed -
it guarantees a mismatch degrades to something visible and debuggable
instead of a silent blank tab.

**2. The instructor note-content view was cut entirely.** It had grown
into a full Read/Dictionary/Test reader mirroring the student experience,
because the backend doc says staff "always see everything." That's a
permission ceiling on the API, not a UI requirement. The instructor's
actual job is three things: upload, watch student progress, start/end the
test - nothing about reading note content. The dedicated
`/instructor/courses/:courseId/notes/:noteId` page and route are gone;
Start Test / Reveal Test are now inline actions directly on each note row
in the course list, and the upload flow lands back on that list instead
of a note-reading page.

**What I couldn't verify from here:** this sandbox has no live backend
and no browser to click through the app in. I attempted to prove the MCQ
rendering with an isolated SSR test (mock data shaped exactly like the
handoff doc's JSON examples, rendered via `svelte/server`), but the test
harness itself failed for environment reasons (`ssrLoadModule` outside
SvelteKit's own request/response cycle didn't behave like a normal
component render) - inconclusive, not evidence either way, so it isn't
shipped. The fixes above come from a rigorous manual re-read of every
affected component against the confirmed API shapes, not from a green
test run. **The next real signal is your browser's DevTools console** -
if a tab is still blank after this, whatever error appears there will
point at the exact remaining mismatch far more precisely than another
round of guessing here would.
