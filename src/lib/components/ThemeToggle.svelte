<script lang="ts">
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { theme } from '$lib/stores/theme.svelte';

	function toggle() {
		theme.set(theme.resolved === 'dark' ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	onclick={toggle}
	class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
	aria-label={theme.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if theme.resolved === 'dark'}
		<Sun size={18} aria-hidden="true" />
	{:else}
		<Moon size={18} aria-hidden="true" />
	{/if}
</button>
