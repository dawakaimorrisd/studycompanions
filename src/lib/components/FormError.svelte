<script lang="ts">
	interface Props {
		message: string;
		actionLabel?: string;
		onaction?: () => void;
	}

	let { message, actionLabel, onaction }: Props = $props();
</script>

<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
	<p>{message}</p>
	{#if actionLabel && onaction}
		<button type="button" class="mt-1 font-medium underline underline-offset-2" onclick={onaction}>
			{actionLabel}
		</button>
	{/if}
</div>
