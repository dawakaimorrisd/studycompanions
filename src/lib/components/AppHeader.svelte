<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.svelte';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserRound from '@lucide/svelte/icons/user-round';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ThemeToggle from './ThemeToggle.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		actions?: Snippet;
		backHref?: string;
		backLabel?: string;
	}

	let {
		title,
		subtitle,
		actions,
		backHref,
		backLabel = 'Back'
	}: Props = $props();

	const accountHref = $derived(
		session.role === 'instructor'
			? '/instructor/account'
			: '/student/account'
	);

	function signOut() {
		session.clear();
		goto('/login');
	}
</script>

<header class="border-b border-gray-200 bg-surface px-4 py-4 sm:px-6">
	<div class="mx-auto max-w-3xl">
		<div class="flex items-center justify-between gap-3">
			<div class="flex min-w-0 items-center gap-3">
				{#if backHref}
					<a
						href={backHref}
						class="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
						aria-label={backLabel}
					>
						<ArrowLeft size={16} aria-hidden="true" />
						<span>{backLabel}</span>
					</a>
				{/if}

				<div class="min-w-0">
					<h1 class="truncate font-display text-lg font-semibold text-gray-900">
						{title}
					</h1>

					{#if subtitle}
						<p class="truncate text-sm text-gray-500">
							{subtitle}
						</p>
					{/if}
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-1">
				{#if actions}
					{@render actions()}
				{/if}

				<ThemeToggle />

				<a
					href={accountHref}
					aria-label="Account"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
				>
					<UserRound size={18} aria-hidden="true" />
				</a>

				<button
					type="button"
					aria-label="Sign out"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
					onclick={signOut}
				>
					<LogOut size={18} aria-hidden="true" />
				</button>
			</div>
		</div>
	</div>
</header>