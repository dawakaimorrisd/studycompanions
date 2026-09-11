import { browser } from '$app/environment';
import { api, ApiError } from '$lib/api/client';
import { queuePendingStudySession } from '$lib/offline/db';

const INACTIVITY_TIMEOUT_MS = 45_000; // "30-60 seconds with no interaction" - see the backend handoff doc's spec for the exact number to standardize on with backend, if it ever needs to match
const ACTIVITY_EVENTS = ['scroll', 'click', 'keydown', 'touchstart'] as const;

/**
 * Activity-based study tracking (replaces the earlier explicit Start/End
 * Study button model entirely - see the backend handoff doc's
 * "Activity-based study tracking" section for the full before/after and
 * what this needs from backend).
 *
 * How it works, matching the agreed spec point for point:
 *  - Page/scroll activity: a session begins the moment the student
 *    scrolls, clicks, types, or touches the page - not on page load.
 *  - Active time: only the time between "activity resumed" and "activity
 *    stopped" counts, never idle time sitting on the page.
 *  - Inactivity: no activity for INACTIVITY_TIMEOUT_MS ends the current
 *    session (pausing the timer); the next activity starts a new one.
 *  - App visibility: switching tabs/apps ends the session immediately,
 *    same as inactivity - `document.visibilitychange`.
 *  - Offline storage: if starting a session fails because of a genuine
 *    network failure (ApiError.networkFailure, not a real rejection),
 *    this falls back to purely local accumulation - it still tracks
 *    active/inactive/visibility exactly the same way, it just can't get a
 *    server session id, so at the end of that interval it queues
 *    { contentId, kind, seconds, occurredAt } to IndexedDB instead.
 *  - Sync later: offline/sync.ts's flushPendingSync() drains that queue
 *    when the browser comes back online, via api/study-activity.ts's
 *    backfillStudySession() - confirmed real and implemented as of the
 *    v3 handoff.
 *
 * This intentionally has no public start()/end() - there's nothing for a
 * "Start Study" button to call anymore. `attach()`/`destroy()` are the
 * only lifecycle hooks a reader page needs.
 */
export class ActivityTracker {
	private readonly noteId: string;

	/** For UI only (a small "tracking" indicator) - not sent anywhere. */
	status = $state<'idle' | 'active'>('idle');

	private sessionId: string | null = null;
	private localAccumulationStartedAt: number | null = null;
	private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
	private attached = false;
	private starting = false;

	private readonly handleActivity = () => this.onActivity();
	private readonly handleVisibilityChange = () => {
		if (document.visibilityState === 'hidden') this.pause();
	};
	private readonly handlePageHide = () => this.pause(/* keepalive */ true);

	constructor(noteId: string) {
		this.noteId = noteId;
	}

	attach() {
		if (!browser || this.attached) return;
		this.attached = true;
		for (const evt of ACTIVITY_EVENTS) {
			window.addEventListener(evt, this.handleActivity, { passive: true });
		}
		document.addEventListener('visibilitychange', this.handleVisibilityChange);
		window.addEventListener('pagehide', this.handlePageHide);
	}

	destroy() {
		if (!browser || !this.attached) return;
		for (const evt of ACTIVITY_EVENTS) {
			window.removeEventListener(evt, this.handleActivity);
		}
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		window.removeEventListener('pagehide', this.handlePageHide);
		this.attached = false;
		this.pause();
	}

	private onActivity() {
		if (document.visibilityState === 'hidden') return; // shouldn't fire, but be defensive

		this.resetInactivityTimer();

		if (this.status === 'active' || this.starting) return;
		this.begin();
	}

	private resetInactivityTimer() {
		if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
		this.inactivityTimer = setTimeout(() => this.pause(), INACTIVITY_TIMEOUT_MS);
	}

	private async begin() {
		this.starting = true;
		try {
			const res = await api.post<{ sessionId: string; startedAt: string }>(
				'/api/v1/study-sessions/start',
				{ noteId: this.noteId }
			);
			this.sessionId = res.sessionId;
			this.status = 'active';
		} catch (err) {
			if (err instanceof ApiError && err.networkFailure) {
				// Genuinely offline - track locally instead of dropping the
				// interval on the floor.
				this.localAccumulationStartedAt = Date.now();
				this.status = 'active';
			} else {
				// A real rejection (auth, validation, etc.) - don't track
				// this interval at all rather than guessing.
				this.status = 'idle';
			}
		} finally {
			this.starting = false;
		}
	}

	private pause(useKeepalive = false) {
		if (this.inactivityTimer) {
			clearTimeout(this.inactivityTimer);
			this.inactivityTimer = null;
		}
		if (this.status !== 'active') return;

		if (this.sessionId !== null) {
			const id = this.sessionId;
			api.post(`/api/v1/study-sessions/${id}/end`, undefined, { keepalive: useKeepalive }).catch(() => {
				// Idempotent server-side and harmless either way (an
				// unclosed session just contributes nothing to analytics) -
				// not worth a retry loop for the online case.
			});
			this.sessionId = null;
		} else if (this.localAccumulationStartedAt !== null) {
			const seconds = Math.max(0, Math.round((Date.now() - this.localAccumulationStartedAt) / 1000));
			const startedAt = this.localAccumulationStartedAt;
			this.localAccumulationStartedAt = null;
			if (seconds > 0) {
				queuePendingStudySession({
					kind: 'note',
					contentId: this.noteId,
					durationSeconds: seconds,
					queuedAt: new Date(startedAt).toISOString()
				}).catch(() => {
					// Nothing better to do if IndexedDB itself is
					// unavailable - this interval is lost, same as it would
					// have been under the old start/end model's own
					// documented "abandoned session" case.
				});
			}
		}

		this.status = 'idle';
	}
}
