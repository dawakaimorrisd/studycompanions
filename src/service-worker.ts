/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `study-companion-${version}`;

// `build` = the built JS/CSS. `files` = everything under /static.
// '/' is cached explicitly too: this is a fully client-rendered app (SSR is
// off app-wide, see src/routes/+layout.ts), so once the client router has
// hydrated, the same shell can serve any route - a failed navigation to
// /student/notes/abc falls back to this cached '/' response, and SvelteKit's
// router takes it from there using the URL the browser already has.
const ASSETS = [...build, ...files, '/'];

sw.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}
	event.waitUntil(addFilesToCache());
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
	event.waitUntil(sw.clients.claim());
});

sw.addEventListener('fetch', (event) => {
	// Only GET, and only this app's own origin - the backend API lives on a
	// different origin (PUBLIC_API_BASE_URL) and is deliberately left
	// untouched here. Downloaded note/assignment content is handled
	// explicitly through IndexedDB (src/lib/offline/), not by opportunistic
	// HTTP caching, so there's nothing this service worker needs to do for
	// API calls one way or the other.
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;

	async function respond(): Promise<Response> {
		const cache = await caches.open(CACHE);

		if (ASSETS.includes(url.pathname)) {
			const cached = await cache.match(url.pathname);
			if (cached) return cached;
		}

		try {
			const response = await fetch(event.request);
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			const cached = await cache.match(event.request);
			if (cached) return cached;

			if (event.request.mode === 'navigate') {
				const shell = await cache.match('/');
				if (shell) return shell;
			}

			throw new Error('offline and not cached');
		}
	}

	event.respondWith(respond());
});
