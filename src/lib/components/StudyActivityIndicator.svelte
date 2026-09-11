<script lang="ts">
	// Passive only - there's nothing to click. Activity-based tracking
	// starts/stops itself based on real interaction (see
	// activity-tracking.svelte.ts); this just reflects its current state
	// so the student isn't left guessing whether anything is happening.
	import type { ActivityTracker } from '$lib/activity-tracking.svelte';

	interface Props {
		tracker: ActivityTracker;
	}

	let { tracker }: Props = $props();
</script>

<div class="flex items-center gap-2 text-xs text-gray-400">
	{#if tracker.status === 'active'}
		<span class="relative flex h-1.5 w-1.5" aria-hidden="true">
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"
			></span>
			<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500"></span>
		</span>
		<span>Tracking your study time</span>
	{:else}
		<span class="inline-flex h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden="true"></span>
		<span>Study tracking paused - keep scrolling or interacting to resume</span>
	{/if}
</div>
