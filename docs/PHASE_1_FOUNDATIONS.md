# Phase 1 — Foundations

Sets up the project skeleton every later phase builds on: nothing here is
student- or instructor-specific yet.

## What was built

- **Project scaffold** — SvelteKit (Svelte 5, runes mode) + TypeScript,
  Tailwind v4 wired in via `@tailwindcss/vite` (not the CLI, which hung on
  an interactive prompt in this environment — installed the packages and
  configured `vite.config.ts` by hand instead).
- **`src/lib/types.ts`** — every data shape referenced in the handoff
  (auth, courses, notes/assignments, question units, student summaries),
  written up front so every later phase imports from one place instead of
  redefining shapes inline.
- **`src/lib/api/client.ts`** — the single fetch wrapper everything else
  goes through. Attaches the bearer token when present, parses the
  `{ error: { code, message } }` envelope, and on `not_authenticated`
  clears the session and redirects to `/login`. A network-level failure
  (including a CORS block, which throws before any response exists) is
  normalized into the same `ApiError` shape so callers never need a
  separate code path for "never got a response" vs. "got an error
  response."
- **`src/lib/stores/session.svelte.ts`** — runes-based session store,
  persisted to `localStorage`, expiry-checked on load.
- **`src/lib/stores/toasts.svelte.ts` + `ToastHost.svelte`** — a place to
  surface `bad_request` / `conflict` / `rate_limited` messages later.
- **Route skeleton** — `/`, `/login` (stub), `/student/*` and
  `/instructor/*` with role-guarded layouts that redirect based on
  `session.role`.

## Decision: SSR is off, app-wide

`src/routes/+layout.ts` sets `export const ssr = false`. The backend has
no cookie-based auth — the session lives entirely in `localStorage` on the
client — so the server has no way to know who's logged in on the very
first request. Rather than render a logged-out shell that flashes to
logged-in on hydration (or guess), the whole app runs client-rendered.

## Verified

- `npm run check` — clean
- `npm run build` — succeeds
- Confirmed the Tailwind theme tokens actually compile into the output CSS
