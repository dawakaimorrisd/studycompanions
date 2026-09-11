import { browser } from '$app/environment';
import { getAllPendingStudySessions, deletePendingStudySession } from './db';
import { backfillStudySession } from '$lib/api/study-activity';

/**
 * Drains the offline activity-tracking queue (see
 * activity-tracking.svelte.ts) via the backend's study-session backfill
 * endpoint - confirmed real and implemented as of the v3 handoff §8.
 * Notes only, per that endpoint's own scope (assignments don't track).
 *
 * Only removes a queued entry after a confirmed success - `backfillStudySession`
 * returns false on any failure, and this leaves the entry queued for the
 * next attempt rather than risk losing it (the handoff is explicit that
 * this endpoint isn't deduplicated server-side, so the risk runs the
 * other way: never delete before a confirmed 201, or a retry after a
 * flaky reconnect could double-count).
 */
export async function flushPendingSync() {
	if (!browser) return;
	if (!navigator.onLine) return;

	const pending = await getAllPendingStudySessions().catch(() => []);

	for (const entry of pending) {
		if (entry.id === undefined || entry.kind !== 'note') continue;

		const ok = await backfillStudySession({
			noteId: entry.contentId,
			seconds: entry.durationSeconds,
			occurredAt: entry.queuedAt
		});

		if (ok) {
			await deletePendingStudySession(entry.id).catch(() => {});
		}
	}
}
