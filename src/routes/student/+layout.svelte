
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.svelte';
	import { getStudentMe } from '$lib/api/me';
	import { ApiError } from '$lib/api/client';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { studentCourses } from '$lib/stores/student-courses.svelte';
	import DashboardShell from '$lib/components/DashboardShell.svelte';
	import AccessPendingScreen from '$lib/components/AccessPendingScreen.svelte';

	let { children }: { children: () => any } = $props();

	// Phase 10 §0/§3: `paid`/`semester` aren't known from the login response
	// alone, so this starts undefined ("not yet checked") until the first
	// `/me` call resolves - never treated as "paid" in that gap.
	let meLoading = $state(true);
	let meError = $state<string | null>(null);

	async function loadMe() {
		meLoading = true;
		meError = null;
		try {
			const me = await getStudentMe();
			const { semesterChanged } = session.applyMe({
				semester: me.semester,
				paid: me.paid,
				enrolled: me.enrolled
			});
			if (semesterChanged) {
				studentCourses.invalidate();
				toasts.info(`Now showing ${me.semester.name} - your courses and content may have changed.`);
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

		if (session.role !== 'student') {
			goto('/instructor', { replaceState: true });
			return;
		}

		loadMe();
	});
</script>

{#if session.role === 'student'}
	{#if meLoading}
		<div class="flex min-h-screen items-center justify-center bg-gray-50">
			<span
				class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
				aria-hidden="true"
			></span>
		</div>
	{:else if meError}
		<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<div class="w-full max-w-sm rounded-xl border border-gray-200 bg-surface p-6 text-center">
				<p class="text-sm text-gray-600">{meError}</p>
				<button
					type="button"
					class="mt-4 text-sm font-medium text-brand-600 hover:underline"
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
