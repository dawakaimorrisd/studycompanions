# Offline support & PWA

Added after the original six phases, at the student's request: the app is
now installable, and students can download individual Notes and
Assignments to study without a connection.

## What "offline" means here

Two separate things, handled separately:

1. **The app shell loads offline.** SvelteKit's built-in service worker
   support (`src/service-worker.ts`) precaches the built JS/CSS and falls
   back to the cached shell for any navigation the network can't serve.
   This is what makes the app installable and openable with no connection
   at all - it does **not** mean the API works offline; it means the app
   itself opens instead of showing a browser "no internet" page.
2. **Downloaded content is viewable offline.** This is explicit and
   student-controlled, not automatic caching: a student taps "Download" on
   a Note or Assignment, and the full content (Read/Sections text, every
   Q&A unit, the dictionary) is written to IndexedDB. The reader pages try
   the network first and only fall back to the downloaded copy if that
   fails - so a student always sees the live version when one's available,
   and their own downloaded version otherwise.

## Why a service worker + IndexedDB, not a caching proxy

The service worker deliberately does **not** cache API responses. Two
reasons: the backend lives on a different origin than the app (so a
service worker on the app's origin can't intercept those requests via the
same-origin `fetch` handler in the first place, by design), and even if it
could, opportunistic HTTP caching would mean a student's "offline copy"
depends on whatever happened to be fetched and cached during their last
session - not something they chose. Explicit IndexedDB downloads give the
student a clear, visible answer to "what do I actually have offline,"
which matters a lot more here than it would for, say, caching a marketing
site.

## What was added

- **`src/service-worker.ts`** - precaches the app shell using SvelteKit's
  native `$service-worker` module (`build`, `files`, `version`). Registered
  manually from `src/routes/+layout.svelte` (`onMount`), rather than via a
  third-party plugin - see the note below on why.
- **`static/manifest.webmanifest`** + **`static/icons/`** - installability.
  Icons were generated locally (Python/Pillow), not hand-designed; swap
  them for real branding whenever that's ready.
- **`src/lib/offline/db.ts`** - the IndexedDB schema (via the tiny `idb`
  wrapper library): a `downloads` store keyed by `note:<id>` /
  `assignment:<id>`, plus two queues (`pending-study-sessions`,
  `pending-opens`) for the sync story below.
- **`src/lib/offline/downloads.svelte.ts`** - the student-facing download
  store: `download()`, `remove()`, `isDownloaded()`, `get()`.
- **`src/lib/offline/network.svelte.ts`** - a reactive `online` flag off
  `navigator.onLine` + the `online`/`offline` window events.
- **`src/lib/offline/sync.ts`** - retries anything that failed while
  offline (study-session logs, open-marking calls) once the app is back
  online. See "Offline writes" below.
- **`DownloadButton`** - on every item in the student's home list, and in
  the header of both readers. Toggles between Download / Downloading… /
  ✓ Downloaded.
- **`OfflineBanner`** - a thin app-wide bar shown whenever
  `navigator.onLine` is false.
- **Student home** - falls back to a list built from downloaded content if
  the live `/students/me/content` fetch fails, with a banner explaining
  why what's showing might be incomplete.
- **Both readers** - fall back to the downloaded copy if the live fetch
  fails, with a "Viewing your downloaded offline copy" badge so it's never
  ambiguous which version is on screen.

## Offline writes: study-session logging and open-marking

Both of these already fired fire-and-forget before this change (Phase 3).
Now, if the request fails, it's queued in IndexedDB instead of just being
dropped, and `flushPendingSync()` retries the whole queue on app start and
on the browser's `online` event. A queued entry is only ever dropped once
the *server* actually responds with a rejection (a real `ApiError` that
isn't a network failure) - a request that fails because there's genuinely
no connection stays queued indefinitely.

This required one small addition to `ApiError`
(`src/lib/api/client.ts`): a `networkFailure` boolean, true only when a
request never reached the server at all. Without it there was no way to
tell "still offline, keep retrying" apart from "the server rejected this,
stop retrying" from inside the sync worker.

## A decision worth flagging: no third-party PWA plugin

The obvious path here is `vite-plugin-pwa` (or its SvelteKit-specific
wrapper, `@vite-pwa/sveltekit`). Both were tried and backed out: the
generic plugin assumes a single `index.html` Vite build, which doesn't
match how SvelteKit's adapter pipeline works, and the SvelteKit-specific
wrapper's virtual-module integration (`virtual:pwa-info`,
`virtual:pwa-register`) has enough SSR/typing rough edges reported against
it that shipping it untested felt like a worse bet than SvelteKit's own,
officially-documented, dependency-free service worker support - which is
also considerably simpler to reason about for an app this size. If this
project's offline needs grow substantially (background sync scheduling,
push notifications), it may be worth revisiting.

## Verified

- `npm run check` - clean
- `npm run build` - succeeds; confirmed `service-worker.js`,
  `manifest.webmanifest`, and all icon files land in the client build
  output
- Confirmed over HTTP against `npm run preview`: the manifest serves as
  `application/manifest+json`, the service worker and icons resolve with
  `200`
