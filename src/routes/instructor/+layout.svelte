
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import ToastHost from '$lib/components/ToastHost.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import DashboardShell from '$lib/components/DashboardShell.svelte';
	import AccessPendingScreen from '$lib/components/AccessPendingScreen.svelte';

	import { flushPendingSync } from '$lib/offline/sync';
	import { theme } from '$lib/stores/theme.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { getInstructorMe } from '$lib/api/me';
	import { ApiError } from '$lib/api/client';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';

	let { children } = $props();

	// Phase 10 §0/§3 - same pattern as student/+layout.svelte: don't render
	// the dashboard (or decide anything about paid status) until the first
	// `/me` call of this session has actually resolved.
	let meLoading = $state(true);
	let meError = $state<string | null>(null);

	async function loadMe() {
		meLoading = true;
		meError = null;
		try {
			const me = await getInstructorMe();
			const { semesterChanged } = session.applyMe({ semester: me.semester, paid: me.paid });
			if (semesterChanged) {
				// Semester-scoped instructor state (course list, and anything
				// derived from it) is now stale - drop it rather than showing
				// last semester's courses under a new semester banner.
				instructorCourses.invalidate();
				toasts.info(`Now showing ${me.semester.name} - your courses may have changed.`);
			}
		} catch (err) {
			meError = err instanceof ApiError ? err.message : 'Could not check your account status.';
		} finally {
			meLoading = false;
		}
	}

	// Do NOT use `$effect()` here: `loadMe()` writes back into `session`
	// via `session.applyMe()`, and an `$effect` re-runs whenever any
	// reactive value it read changes - including `session.current`, which
	// this effect both reads AND (transitively) writes. That created an
	// infinite "check auth -> load /me -> session changes -> re-check auth
	// -> ..." loop, which is what "the dashboard keeps loading" actually
	// was. `onMount()` runs this exactly once, which is all a one-time
	// "am I logged in, what's my status" check should ever do.
	onMount(() => {
		if (session.current === null) {
			goto('/login', { replaceState: true });
			return;
		}

		if (session.role !== 'instructor') {
			goto('/student', { replaceState: true });
			return;
		}

		loadMe();
	});

	// Global instructor-shell initialization - separate onMount, unrelated
	// to the auth check above.
	onMount(() => {
		theme.apply();
		const stopWatching = theme.watchSystem();

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js', { type: 'module' })
				.catch(() => {
					// Not fatal - the app still works without the
					// offline app shell.
				});
		}

		flushPendingSync();

		window.addEventListener('online', flushPendingSync);

		return () => {
			window.removeEventListener('online', flushPendingSync);
			stopWatching?.();
		};
	});
</script>

<OfflineBanner />
<ToastHost />

{#if session.role === 'instructor'}
	{#if meLoading}
		<div class="flex min-h-screen items-center justify-center bg-gray-50">
			<span
				class="h-8 w-8 animate-spin rounded-full border-2 border-instructor-500 border-t-transparent"
				aria-hidden="true"
			></span>
		</div>
	{:else if meError}
		<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<div class="w-full max-w-sm rounded-xl border border-gray-200 bg-surface p-6 text-center">
				<p class="text-sm text-gray-600">{meError}</p>
				<button
					type="button"
					class="mt-4 text-sm font-medium text-instructor-600 hover:underline"
					onclick={loadMe}
				>
					Try again
				</button>
			</div>
		</div>
	{:else if session.paid === false}
		<AccessPendingScreen onrecheck={loadMe} rechecking={meLoading} />
	{:else}
		<DashboardShell>
			{@render children()}
		</DashboardShell>
	{/if}
{/if}
