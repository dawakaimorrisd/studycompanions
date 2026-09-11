<script lang="ts">
	// Phase 10 §3: purely a "detect and communicate" screen - there is no
	// in-app payment flow and no client-triggerable "check payment status"
	// endpoint. The only way out of this screen is the student/instructor
	// logging out and back in (or an admin/moderator activating access from
	// the console, then the user reloading), so this deliberately doesn't
	// poll - it just re-runs `/me` on demand via the button below.
	import { session } from '$lib/stores/session.svelte';
	import Button from './Button.svelte';
	import LogOut from '@lucide/svelte/icons/log-out';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';

	interface Props {
		/** Re-runs the role-appropriate /me call. Passed in so this component doesn't need to know which role it's rendering for. */
		onrecheck: () => void;
		rechecking?: boolean;
	}

	let { onrecheck, rechecking = false }: Props = $props();

	function logout() {
		session.clear();
		window.location.href = '/login';
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-md rounded-xl border border-gray-200 bg-surface p-8 text-center shadow-sm">
		<div
			class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
		>
			<ShieldAlert size={24} aria-hidden="true" />
		</div>

		<h1 class="mt-4 font-display text-lg font-semibold text-gray-900">
			Access not activated yet
		</h1>

		<p class="mt-2 text-sm text-gray-500">
			Your access for {session.semester?.name ?? 'the current semester'} hasn't been activated yet.
			Contact your administrator to get set up, then check again below.
		</p>

		<div class="mt-6 flex flex-col gap-2">
			<Button
				onclick={onrecheck}
				loading={rechecking}
				tone={session.role === 'instructor' ? 'instructor' : 'brand'}
				class="w-full"
			>
				<RefreshCw size={16} aria-hidden="true" />
				Check again
			</Button>
			<Button variant="ghost" onclick={logout} class="w-full">
				<LogOut size={16} aria-hidden="true" />
				Sign out
			</Button>
		</div>
	</div>
</div>
