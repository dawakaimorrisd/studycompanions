<script lang="ts">
	interface Props {
		/** Index 0 = Sunday ... index 6 = Saturday, seconds studied that weekday. */
		secondsByDay: number[];
	}

	let { secondsByDay }: Props = $props();

	const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const max = $derived(Math.max(1, ...secondsByDay));

	function minutes(seconds: number) {
		return Math.round(seconds / 60);
	}
</script>

<div class="flex h-16 items-end gap-1.5">
	{#each secondsByDay as seconds, i (i)}
		<div class="flex flex-1 flex-col items-center gap-1">
			<div
				class="w-full rounded-t bg-instructor-400"
				style={`height: ${Math.max(2, (seconds / max) * 56)}px`}
				title={`${minutes(seconds)} min`}
			></div>
			<span class="text-[10px] text-gray-400">{labels[i]}</span>
		</div>
	{/each}
</div>
