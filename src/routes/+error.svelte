<script lang="ts">
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.svelte';
	import SearchX from '@lucide/svelte/icons/search-x';

	const homeHref = $derived(
		session.role === 'student' ? '/student' : session.role === 'instructor' ? '/instructor' : '/login'
	);
</script>

<svelte:head>
	<title>Study Companion</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm rounded-xl border border-gray-200 bg-surface p-8 text-center shadow-sm">
		<SearchX size={28} class="mx-auto text-gray-300" aria-hidden="true" />
		<p class="mt-3 font-display text-3xl font-semibold text-gray-300">{page.status}</p>
		<p class="mt-2 text-sm text-gray-600">
			{page.error?.message ?? 'Something went wrong.'}
		</p>
		<a
			href={homeHref}
			class="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
		>
			Back to safety
		</a>
	</div>
</div>
