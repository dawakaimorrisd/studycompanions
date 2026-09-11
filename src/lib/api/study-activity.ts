import { api } from './client';

/**
 * Confirmed real and implemented as of the v3 handoff §8 - offline-only
 * catch-up for the activity tracker (activity-tracking.svelte.ts). The
 * real-time `POST /study-sessions/start`/`.../:id/end` pair can't express
 * "the student was actively studying for N seconds starting around T, but
 * I only found out just now because they were offline" - that pair is
 * real-time-correlated by design. This is the one place `durationSeconds`
 * is genuinely client-computed rather than server-timed - an accepted
 * tradeoff for an inherently-offline scenario.
 *
 * Notes only - Assignments don't get this kind of tracking at all
 * (confirmed "NOTES ONLY" for start/end/backfill in the v3 handoff).
 *
 * Clamped server-side at 6 hours per entry. NOT deduplicated server-side -
 * callers must only remove a queued entry from local storage after a
 * confirmed success, never before (see offline/sync.ts).
 */
export interface StudyActivityBackfillEntry {
	noteId: string;
	/** Client-accumulated active seconds for one contiguous offline study interval. */
	seconds: number;
	/** Roughly "when this interval ended" - places the entry in time, not used to compute the duration. */
	occurredAt: string;
}

export async function backfillStudySession(entry: StudyActivityBackfillEntry): Promise<boolean> {
	try {
		await api.post('/api/v1/study-sessions/backfill', entry);
		return true;
	} catch {
		// Leave it queued for the next flush attempt rather than losing it -
		// a transient failure (network blip mid-sync, server hiccup) is
		// exactly the case this queue exists to survive.
		return false;
	}
}
