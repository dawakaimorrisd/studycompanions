import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { session } from '$lib/stores/session.svelte';
import type { ApiErrorBody, ApiErrorCode } from '$lib/types';

export class ApiError extends Error {
	code: ApiErrorCode;
	/**
	 * True only when the request never reached the server at all (offline,
	 * DNS failure, CORS block) - as opposed to the server responding with
	 * an actual error. src/lib/offline/sync.ts uses this to decide what's
	 * safe to retry later versus what was a real rejection.
	 */
	networkFailure: boolean;

	constructor(code: ApiErrorCode, message: string, networkFailure = false) {
		super(message);
		this.name = 'ApiError';
		this.code = code;
		this.networkFailure = networkFailure;
	}
}

interface RequestOptions {
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	/** JSON-serializable body, or a FormData instance for multipart requests. */
	body?: unknown;
	/** Send the bearer token, if one is present. Defaults to true. */
	auth?: boolean;
	/**
	 * Passed straight through to fetch. Lets a request started right as the
	 * page is unloading (e.g. study-session logging) survive the
	 * navigation instead of being cancelled mid-flight. See
	 * src/lib/activity-tracking.svelte.ts for why this is used instead of
	 * navigator.sendBeacon: sendBeacon can't set an Authorization header,
	 * and every route here requires a bearer token.
	 */
	keepalive?: boolean;
}

/**
 * Every authenticated request goes through here so the two backend-wide
 * contracts from FRONTEND_HANDOFF.md §3 are handled in exactly one place:
 *  - the { error: { code, message } } shape, branched on `code` not `message`
 *  - a global `not_authenticated` -> clear session, redirect to /login
 *
 * A network-level failure (including a CORS block, which shows up as a
 * fetch rejection with no response at all) is normalized into an
 * ApiError so callers never need a separate catch path for "the request
 * didn't even complete" vs "the server returned an error".
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { method = 'GET', body, auth = true, keepalive = false } = options;
	const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

	const headers: Record<string, string> = {};
	if (body !== undefined && !isFormData) {
		headers['Content-Type'] = 'application/json';
	}
	if (auth && session.token) {
		headers['Authorization'] = `Bearer ${session.token}`;
	}

	let res: Response;
	try {
		res = await fetch(`${PUBLIC_API_BASE_URL}${path}`, {
			method,
			headers,
			keepalive,
			body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body)
		});
	} catch {
		throw new ApiError(
			'internal_error',
			"Could not reach the server. If this just started happening, it's most likely this app's origin isn't registered in the backend's FRONTEND_ORIGIN yet - that shows up as a silent CORS block, not a normal error response.",
			true
		);
	}

	if (res.status === 204) {
		return undefined as T;
	}

	let data: unknown = null;
	try {
		data = await res.json();
	} catch {
		// no/invalid body - fall through, handled below per status
	}

	if (!res.ok) {
		const body = data as ApiErrorBody | null;
		const code = body?.error?.code ?? 'internal_error';
		const message = body?.error?.message ?? 'Something went wrong. Please try again.';

		if (code === 'not_authenticated') {
			session.clear();
			if (browser) goto('/login');
		}

		throw new ApiError(code, message);
	}

	return data as T;
}

export const api = {
	get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
		apiRequest<T>(path, { ...options, method: 'GET' }),
	post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
		apiRequest<T>(path, { ...options, method: 'POST', body }),
	patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
		apiRequest<T>(path, { ...options, method: 'PATCH', body })
};
