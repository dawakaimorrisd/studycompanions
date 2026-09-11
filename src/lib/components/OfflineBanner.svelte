<script lang="ts">
	import { network } from '$lib/offline/network.svelte';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
</script>

{#if !network.online}
	<div
		class="flex items-center justify-center gap-1.5 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white"
		role="status"
	>
		<WifiOff size={14} aria-hidden="true" />
		You're offline — showing downloaded content where available.
	</div>
{/if}
