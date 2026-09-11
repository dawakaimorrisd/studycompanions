// This app authenticates with a bearer token stored client-side (no
// cookie-based auth - see FRONTEND_HANDOFF.md §1/§3). The server has no way
// to know who's logged in on first request, so SSR would either render a
// logged-out shell that immediately flashes to logged-in, or guess wrong.
// Running as a client-rendered app sidesteps that entirely.
export const ssr = false;
