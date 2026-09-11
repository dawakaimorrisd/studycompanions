<script lang="ts">
	import type { OptionKey, QuestionUnit } from '$lib/types';
	import McqQuestion from './McqQuestion.svelte';
	import Button from '$lib/components/Button.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import BookOpen from '@lucide/svelte/icons/book-open';

	const CHUNK_SIZE = 5;

	interface Props {
		questionUnits: QuestionUnit[];
		mode: 'locked' | 'select' | 'review';

		selections?: Record<string, OptionKey | undefined>;

		pickedOptions?: Record<string, OptionKey | undefined>;
	}

	let {
		questionUnits,
		mode,
		selections = $bindable({}),
		pickedOptions = {}
	}: Props = $props();

	const ordered = $derived(
		[...(questionUnits ?? [])].sort(
			(a, b) => (a.order ?? 0) - (b.order ?? 0)
		)
	);

	const chunkCount = $derived(
		Math.max(1, Math.ceil(ordered.length / CHUNK_SIZE))
	);

	let chunkIndex = $state(0);

	$effect(() => {
		if (chunkIndex >= chunkCount) {
			chunkIndex = Math.max(0, chunkCount - 1);
		}
	});

	const currentChunk = $derived(
		ordered.slice(
			chunkIndex * CHUNK_SIZE,
			chunkIndex * CHUNK_SIZE + CHUNK_SIZE
		)
	);
</script>

{#if ordered.length === 0} <div
 	class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
 > <BookOpen size={20} class="text-gray-300" aria-hidden="true" />
No questions here yet. </div>
{:else} <div class="flex flex-col gap-4">
{#each currentChunk as unit (unit.id)}

		{#if mode === 'select'}
			<McqQuestion
				{unit}
				index={ordered.indexOf(unit)}
				{mode}
				bind:selected={selections[unit.id]}
			/>
		{:else}
			<McqQuestion
				{unit}
				index={ordered.indexOf(unit)}
				{mode}
				selected={undefined}
				pickedOption={pickedOptions[unit.id] ?? null}
			/>
		{/if}

	{/each}
</div>

{#if chunkCount > 1}
	<div class="mt-4 flex items-center justify-between">
		<Button
			variant="secondary"
			disabled={chunkIndex === 0}
			onclick={() => chunkIndex--}
		>
			<ChevronLeft size={15} aria-hidden="true" />
			Previous
		</Button>

		<p class="font-mono-nums text-sm text-gray-500">
			Page {chunkIndex + 1} of {chunkCount}
		</p>

		<Button
			variant="secondary"
			disabled={chunkIndex === chunkCount - 1}
			onclick={() => chunkIndex++}
		>
			Next
			<ChevronRight size={15} aria-hidden="true" />
		</Button>
	</div>
{/if}


{/if}
