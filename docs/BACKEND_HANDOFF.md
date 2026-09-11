# Study Companion Frontend — Backend Handoff (v3)

## BLOCKING: Assignment is student-originated - two endpoints don't exist yet

This is the biggest architectural change in the whole rebuild.

An "assignment" was never meant to be a digital task someone sets up in the app first. What the instructor assigns as homework happens in class, out of the app entirely - the app's only job is being the place a student turns their completed homework into something useful: a readable PDF, a self-drill, and something they can optionally share with classmates. Confirmed directly: **nobody pre-creates an assignment record - not Instructor, not Admin either. A student's first upload creates it.**

This replaces the Instructor/Admin-created-assignment model entirely (Instructor's create/generate/publish flow for Assignments has already been removed from the frontend - see §3). A student picks a course, describes what they're turning in, uploads it - that single action needs to create both the Assignment record and its Submission together. There's no "browse assignments and submit to one."

**What this needs - two endpoints:**

```
POST /api/v1/students/me/courses/:courseId/assignments   (multipart/form-data)
  fields: title? (default to something sensible if omitted),
          type (required: "INDIVIDUAL" | "GROUP"),
          groupName? (GROUP only), memberStudentIds? (GROUP only, repeated),
          file (required)
→ 201 { assignmentId, submissionId, title, type, pdfUrl, pdfConversionError }
```
Same extraction + PDF-conversion pipeline as the existing submission endpoint - this just creates the Assignment record in the same transaction instead of requiring one to already exist. Immediately visible to the Instructor for that course (read-only) - no publish step, since there's no one left to publish it.

```
GET /api/v1/students/me/courses/:courseId/eligible-group-members
```
Same shape/purpose as the existing (assignment-scoped) `eligible-group-members` endpoint, just course-scoped - a student picks group members *before* the assignment exists, so there's no assignment id yet to scope it to.

**Everything downstream of creation already fits this model, unchanged** - `GET /students/me/assignments/:id/submission`, `generate`, `eligible-recipients`, `distribute`, `received-distributions`, and the distribution drill start/submit pair were always modeled around "my own submission," never a separate task definition. Once the two endpoints above exist, generate/drill/share all work exactly as already built.

**Frontend status:** built and calling both endpoints already (`api/submissions.ts`'s `createMyAssignment`/`getCourseEligibleGroupMembers`, used from the new `/student/assignments/new` page). Both will 404 until these exist - nothing else regresses, the rest of the app works independently of this.

**Open question this raises:** does `publishedAt` on an Assignment still mean anything? The Instructor UI has stopped reading it (a submission is visible the instant it's made, there's no release step) - safe to drop from the response if it's not otherwise needed, but not urgent either way.

---

## 1. Confirmed aligned - no frontend action needed

- **Assignment PDF pipeline** — `pdfUrl`/`pdfConversionError` consumed everywhere an assignment or submission is read: the assignment's own PDF-first reading page, the instructor's read-only review page, the instructor's submissions list (opens `pdfUrl`, never `fileUrl`), a student's own submission, a received distribution.
- **Activity-based study tracking** — the real-time Start/End pair for the online case, `POST /study-sessions/backfill` for the offline case, Notes-only. The offline queue only ever removes an entry after a confirmed success.
- **Real distribution gating** — `DistributionDrillPanel` calls `POST /students/me/distributions/:id/drill/start` / `.../drill/submit`, mirroring `AssignmentDrillPanel`'s exact pattern. No cosmetic client-side-only gating anywhere anymore.
- **GROUP-only generate/share** — gated on `submission.type === 'GROUP' && submission.isSubmitter`; an INDIVIDUAL submission never shows a Generate/Share affordance.
- **Real "did I submit this" endpoint** — `GET /students/me/assignments/:id/submission` is the single source of truth for a student's own assignment page (no more `localStorage` guessing).
- **Submitter's own drill** — `generate`'s response includes the full `questionUnits` bundle, so the person who submitted can drill their own generated material, not just send it away.

---

## 2. Still open

### 2.1 Please verify: Cloudinary CORS for blob-caching

The frontend caches every opened PDF as a raw blob in IndexedDB (`offline/pdf-cache.ts`) - fetches once via `fetch()`, stores it, reuses it on every later open anywhere in the app. This requires the PDF host to send CORS headers permitting the response body to be read cross-origin. If caching silently never kicks in (every open looks like a fresh network fetch, no "Cached" badge shows), check `Access-Control-Allow-Origin` on the Cloudinary response first.

### 2.2 Open question: PDF size for already-a-PDF uploads

Text-rendered PDFs (from DOCX/pasted text) are reasonably compressed via `pdf-lib`'s `useObjectStreams`. Files that were already a PDF at upload time pass through uncompressed. Combined with the frontend's indefinite (no-eviction) blob cache, a student or instructor who opens a lot of large original-PDF uploads will accumulate them in browser storage at full size, forever. Not a bug, just a real product/infra tradeoff worth a decision at some point - flagging so it isn't "discovered" later as unexplained storage growth.

---

## 3. Frontend-only decisions (no backend action, kept here for context)

- **Instructor is fully read-only on Assignments** - no create/generate/publish anywhere (that flow was removed from the Instructor UI first, then superseded entirely by the change at the top of this doc: nobody pre-creates these, students do, by submitting).
- **Instructor never sees generated Q&A/dictionary content**, for Notes or Assignments, at any stage - a pure display decision. The underlying endpoints still return full `questionUnits` to a staff caller with `canManageCourse`; the frontend just never renders that part.
- **A student's assignment page has no "submit" step of its own anymore** - reading, drilling, and sharing all live on `/student/assignments/[id]`, reached only after creation via `/student/assignments/new`. There's no scenario where a student views an assignment they haven't submitted (or been tagged in), since the list they see is only ever their own.
- **The submitter's self-drill is scored client-side**, not through a dedicated attempt endpoint - legitimate here since the backend sends the questions fully revealed to the submitter by design (unlike the recipient case in §1, which needed real server-side gating because a distribution *is* something received from someone else).
- **PDF caching has no eviction policy.** Every distinct `pdfUrl` opened stays in IndexedDB indefinitely. Fine for normal volumes; worth an LRU pass (`offline/pdf-cache.ts`) if storage-quota complaints come up - see §2.2.

---

## 4. Not done — out of scope for now

- The Admin console (`activateSemester`, `previewRollover`) — separate app, confirmed out of scope.
- Custom date-range analytics — `period` only accepts `today`/`week`/`month`.
- Chapter-level (as opposed to per-student) analytics — confirmed intentionally not in the API.
- Running `npm install && npx svelte-check` — no network access in the environment this was built in. Please run this before shipping; everything here was checked by hand against each component's actual `Props` interface and the backend's documented response shapes, not by a compiler or a live API.
