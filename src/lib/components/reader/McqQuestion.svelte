<script lang="ts">
	import type { OptionKey, QuestionUnit } from '$lib/types';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import XCircle from '@lucide/svelte/icons/x-circle';

	interface Props {
		unit: QuestionUnit;
		index: number;
		mode: 'locked' | 'select' | 'review';

		/**
		 * Student's current answer while selecting.
		 */
		selected?: OptionKey | undefined;

		/**
		 * Student's submitted answer while reviewing.
		 */
		pickedOption?: OptionKey | null;
	}

	let {
		unit,
		index,
		mode,
		selected = $bindable(),
		pickedOption = null
	}: Props = $props();

	const options: { key: OptionKey; text: string }[] = $derived([
		{ key: 'A', text: unit.optionA },
		{ key: 'B', text: unit.optionB },
		{ key: 'C', text: unit.optionC },
		{ key: 'D', text: unit.optionD }
	]);

	function isCorrect(key: OptionKey): boolean {
		return mode === 'review' && unit.correctOption === key;
	}

	function isWrongPick(key: OptionKey): boolean {
		return (
			mode === 'review' &&
			pickedOption === key &&
			unit.correctOption !== key
		);
	}

	function optionClasses(key: OptionKey): string {
		/*
		 * Correct answer takes priority.
		 */
		if (isCorrect(key)) {
			return 'border-green-400 bg-green-50 text-green-900 ring-1 ring-green-300';
		}

		/*
		 * Student selected this answer and it was wrong.
		 */
		if (isWrongPick(key)) {
			return 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-300';
		}

		/*
		 * Other answers while reviewing.
		 */
		if (mode === 'review') {
			return 'border-gray-200 bg-white text-gray-600';
		}

		/*
		 * While answering.
		 */
		if (mode === 'select') {
			return selected === key
				? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-300'
				: 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50/40';
		}

		return 'border-gray-200 text-gray-600';
	}
</script>

<div class="rounded-xl border border-gray-200 bg-surface p-5">
	<p class="text-xs font-medium text-gray-400">
		Question {index + 1}
	</p>

<p class="mt-1 text-base font-semibold text-gray-900">
	{unit.question}
</p>

<div class="mt-3 flex flex-col gap-2">
	{#each options as opt (opt.key)}
		<button
			type="button"
			disabled={mode !== 'select'}
			class={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${optionClasses(opt.key)} ${mode !== 'select' ? 'cursor-default' : ''}`}
			onclick={() => {
				if (mode === 'select') {
					selected = opt.key;
				}
			}}
		>
			<span class="shrink-0 font-semibold">
				{opt.key}
			</span>

			<span
				class:line-through={isWrongPick(opt.key)}
				class:text-red-900={isWrongPick(opt.key)}
				class="flex-1"
			>
				{opt.text}
			</span>

			{#if isCorrect(opt.key)}
				<span
					class="flex shrink-0 items-center gap-1 text-xs font-semibold text-green-700"
				>
					<CheckCircle2 size={14} aria-hidden="true" />
					Correct answer
				</span>

			{:else if isWrongPick(opt.key)}
				<span
					class="flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700"
				>
					<XCircle size={14} aria-hidden="true" />
					Your answer
				</span>
			{/if}
		</button>
	{/each}
</div>

{#if mode === 'review' && unit.explanation}
	<div class="mt-3 rounded-lg bg-brand-50 p-3">
		<p class="text-xs font-medium tracking-wide text-brand-700 uppercase">
			Explanation
		</p>

		<p class="mt-1 text-sm whitespace-pre-wrap text-brand-900">
			{unit.explanation}
		</p>
	</div>
{/if}

</div>
