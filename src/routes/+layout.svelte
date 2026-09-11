<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import ToastHost from '$lib/components/ToastHost.svelte';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import { flushPendingSync } from '$lib/offline/sync';
	import { theme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	onMount(() => {
		theme.apply();
		const stopWatching = theme.watchSystem();

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js', { type: 'module' }).catch(() => {
				// Not fatal - the app still works, it just won't have an
				// offline app shell. Downloaded content (IndexedDB) is
				// unaffected either way.
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
{@render children()}
