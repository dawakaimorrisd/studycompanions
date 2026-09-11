<script lang="ts">
	import type { QuestionUnit } from '$lib/types';
	import Library from '@lucide/svelte/icons/library';

	interface Props {
		questionUnits: QuestionUnit[];
		generatedAt: string | null;
	}

	let { questionUnits, generatedAt }: Props = $props();

	// Note-wide glossary, not grouped by question - dedupe by term, first
	// definition/example seen wins, sorted alphabetically for scanability.
	const entries = $derived.by(() => {
		const byTerm = new Map<string, { definition: string; example: string | null }>();
		for (const unit of questionUnits ?? []) {
			for (const entry of unit.dictionaryEntries ?? []) {
				if (!byTerm.has(entry.term)) {
					byTerm.set(entry.term, { definition: entry.definition, example: entry.example });
				}
			}
		}
		return [...byTerm.entries()]
			.map(([term, rest]) => ({ term, ...rest }))
			.sort((a, b) => a.term.localeCompare(b.term));
	});
</script>

{#if generatedAt === null}
	<div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
		<Library size={20} class="text-gray-300" aria-hidden="true" />
		Your instructor hasn't finished preparing this yet.
	</div>
{:else if entries.length === 0}
	<div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
		<Library size={20} class="text-gray-300" aria-hidden="true" />
		No glossary terms for this one.
	</div>
{:else}
	<dl class="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 bg-surface">
		{#each entries as entry (entry.term)}
			<div class="px-5 py-3">
				<dt class="text-sm font-semibold text-gray-900">{entry.term}</dt>
				<dd class="mt-0.5 text-sm text-gray-600">{entry.definition}</dd>
				{#if entry.example}
					<dd class="mt-1 text-sm text-gray-500 italic">e.g. {entry.example}</dd>
				{/if}
			</div>
		{/each}
	</dl>
{/if}
