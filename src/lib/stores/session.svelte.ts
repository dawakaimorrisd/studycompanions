import { browser } from '$app/environment';
import type { Role, StudentIdentity, InstructorIdentity, Semester } from '$lib/types';

const STORAGE_KEY = 'sc_session';

export interface Session {
	token: string;
	role: Role;
	expiresAt: string;
	student?: StudentIdentity;
	instructor?: InstructorIdentity;
	/**
	 * Populated by `refresh()` right after login and on app load (Phase 10
	 * §1) - absent only in the brief window between a successful
	 * login/signup response and that first `/me` call resolving.
	 */
	semester?: Semester;
	paid?: boolean;
	/** Student only - Instructor has no equivalent field on `/instructors/me`. */
	enrolled?: boolean;
}

function loadInitial(): Session | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Session;
		if (!parsed?.token || new Date(parsed.expiresAt).getTime() <= Date.now()) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

/**
 * Bearer-token session, persisted to localStorage so it survives reloads
 * for the lifetime of SESSION_TTL_DAYS. There's no refresh-token flow (per
 * the handoff) - when the backend starts returning `not_authenticated`,
 * the API client clears this and the route guards send the user back to
 * /login. Note: localStorage is readable by any script on the page, so if
 * this app's XSS surface grows, swap this for a more locked-down strategy.
 *
 * Phase 10 addition: `paid`/`enrolled`/`semester` live here too, refreshed
 * via `refresh()` (which calls the role-appropriate `/me` endpoint) rather
 * than re-derived from login/signup responses, since login never returns
 * them - see auth.ts and frontendgurad.md §1.
 */
class SessionStore {
	current = $state<Session | null>(loadInitial());

	set(session: Session) {
		this.current = session;
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	}

	/** Merge in fields (e.g. from a `/me` response) without touching token/role/expiresAt. */
	private patch(fields: Partial<Session>) {
		if (!this.current) return;
		this.current = { ...this.current, ...fields };
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
	}

	clear() {
		this.current = null;
		if (browser) localStorage.removeItem(STORAGE_KEY);
	}

	get token(): string | null {
		return this.current?.token ?? null;
	}

	get role(): Role | null {
		return this.current?.role ?? null;
	}

	get isAuthenticated(): boolean {
		return this.current !== null;
	}

	get semester(): Semester | null {
		return this.current?.semester ?? null;
	}

	/** Undefined (not yet known) is treated as "not confirmed paid" everywhere it's checked - see AccessPendingScreen usage. */
	get paid(): boolean | undefined {
		return this.current?.paid;
	}

	/**
	 * Applies a fresh `/me` result to the session and reports whether the
	 * active semester changed since the last time we checked (Phase 10
	 * §0: "don't cache semester-scoped data across app sessions without
	 * checking the semester.id you get back still matches"). Callers
	 * (the layout guards) use the return value to invalidate any
	 * semester-scoped stores - instructorCourses, downloaded content, etc.
	 */
	applyMe(fields: { semester: Semester; paid: boolean; enrolled?: boolean }): {
		semesterChanged: boolean;
	} {
		const previousSemesterId = this.current?.semester?.id;
		this.patch(fields);
		return {
			semesterChanged: previousSemesterId !== undefined && previousSemesterId !== fields.semester.id
		};
	}
}

export const session = new SessionStore();
