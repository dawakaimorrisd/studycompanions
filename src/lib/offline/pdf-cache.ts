import { getDB } from './db';

/**
 * "Download the PDF once, store the binary blob locally, pull from local
 * storage on re-open instead of hitting the network again" - the same
 * pattern already used for offline note/assignment content (downloads.svelte.ts),
 * applied to PDFs. Keyed by the PDF's own URL, so the assignment's own
 * read view, the student's own submission view, and a received
 * distribution all share one cached copy of the same file instead of
 * each fetching and storing it separately.
 *
 * This is a plain read-through cache, not tied to the explicit "offline
 * download" feature - every PdfViewer open goes through this, whether or
 * not the student ever hit a download button, because the ask was for
 * this to be automatic.
 *
 * Known limitation: no eviction/quota management. A student who reads a
 * lot of large PDFs over time will keep all of them in IndexedDB
 * indefinitely - fine for typical course-material sizes, but worth adding
 * an LRU eviction pass if this becomes a real storage-quota problem.
 * `navigator.storage.estimate()` is the right tool if that's ever needed.
 */

async function getCachedBlob(url: string): Promise<Blob | null> {
	try {
		const db = await getDB();
		const record = await db.get('pdf-cache', url);
		return record?.blob ?? null;
	} catch {
		return null;
	}
}

async function storeCachedBlob(url: string, blob: Blob) {
	try {
		const db = await getDB();
		await db.put('pdf-cache', {
			url,
			blob,
			cachedAt: new Date().toISOString(),
			sizeBytes: blob.size
		});
	} catch {
		// IndexedDB unavailable/full - not fatal, just means this open
		// won't be cached for next time. The viewer still works, it just
		// falls back to the plain remote URL.
	}
}

export interface ResolvedPdf {
	/** An object URL backed by a local blob (cached or freshly fetched-and-cached) - use this as the iframe/embed src. Call revokeResolvedPdf() when done with it. */
	objectUrl: string;
	fromCache: boolean;
}

/**
 * Resolves a PDF URL to a local, offline-capable object URL: serves the
 * cached blob if one exists, otherwise fetches it once, caches it, and
 * returns an object URL for the freshly-fetched blob. Returns null if
 * neither the cache nor the network has it (e.g. genuinely offline on a
 * first-ever open) - callers should fall back to a plain `<iframe src=
 * {pdfUrl}>` in that case rather than showing nothing.
 *
 * Requires `pdfUrl` to be same-origin, or served with CORS headers that
 * allow reading the response body - a cross-origin PDF host without CORS
 * will fail the fetch here even though a plain `<iframe src>` would still
 * have displayed it (the browser navigates the iframe directly instead of
 * running JS-visible fetch). Flagged in the backend handoff doc.
 */
export async function resolvePdf(pdfUrl: string): Promise<ResolvedPdf | null> {
	const cached = await getCachedBlob(pdfUrl);
	if (cached) {
		return { objectUrl: URL.createObjectURL(cached), fromCache: true };
	}

	try {
		const res = await fetch(pdfUrl);
		if (!res.ok) return null;
		const blob = await res.blob();
		await storeCachedBlob(pdfUrl, blob);
		return { objectUrl: URL.createObjectURL(blob), fromCache: false };
	} catch {
		return null;
	}
}

export function revokeResolvedPdf(objectUrl: string) {
	URL.revokeObjectURL(objectUrl);
}
