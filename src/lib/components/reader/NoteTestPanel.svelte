<script lang="ts">
	import type { NoteContent, OptionKey } from '$lib/types';
	import { submitNoteTest } from '$lib/api/content';
	import { ApiError } from '$lib/api/client';
	import { network } from '$lib/offline/network.svelte';
	import PaginatedQuestions from './PaginatedQuestions.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormError from '$lib/components/FormError.svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import Award from '@lucide/svelte/icons/award';

	interface Props {
		note: NoteContent;
		noteId: string;
		onSubmitted?: () => void;
	}

	let { note, noteId, onSubmitted }: Props = $props();

	/*
	 * Each question gets a selection only after the student clicks
	 * an option.
	 *
	 * undefined means "not answered yet".
	 */
	let selections = $state<Record<string, OptionKey | undefined>>({});

	let submitting = $state(false);
	let error = $state<string | null>(null);

	const test = $derived(
		note?.test ?? {
			started: false,
			revealed: false,
			myAttempt: null as NoteContent['test']['myAttempt']
		}
	);

	const questionUnits = $derived(note?.questionUnits ?? []);
	const totalQuestions = $derived(questionUnits.length);

	function describeError(err: unknown): string {
		if (err instanceof ApiError) {
			return err.networkFailure
				? "You'll need to be online to submit the test."
				: err.message;
		}

		return 'Could not submit the test. Please try again.';
	}

	async function handleSubmit() {
		error = null;

		const answered = Object.values(selections).filter(
			(value): value is OptionKey => value !== undefined
		).length;

		if (answered < totalQuestions) {
			error = `Answer every question before submitting (${answered}/${totalQuestions} so far).`;
			return;
		}

		submitting = true;

		try {
			const answers = questionUnits.map((unit) => {
				const selectedOption = selections[unit.id];

				/*
				 * The validation above guarantees that every question
				 * has an answer, but keep this defensive check here so
				 * TypeScript and runtime behavior stay safe.
				 */
				if (!selectedOption) {
					throw new Error('A question is missing an answer.');
				}

				return {
					questionUnitId: unit.id,
					selectedOption
				};
			});

			await submitNoteTest(noteId, answers);

			onSubmitted?.();
		} catch (err) {
			error = describeError(err);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	{#if !test.started}
		<div
			class="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500"
		>
			<Lock size={18} class="shrink-0 text-gray-400" aria-hidden="true" />

			Your instructor hasn't started the chapter test yet. Check back once they do.
		</div>

	{:else if totalQuestions === 0}
		<div
			class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
		>
			No questions here yet.
		</div>

	{:else if !test.myAttempt}
		<div
			class="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
		>
			<CircleDot size={16} class="shrink-0 animate-pulse" aria-hidden="true" />

			Test open — answer every question, then submit. You only get one attempt.
		</div>

		<PaginatedQuestions
			{questionUnits}
			mode="select"
			bind:selections
		/>

		{#if error}
			<FormError message={error} />
		{/if}

		{#if !network.online}
			<p class="text-xs text-gray-500">
				You're offline — you can keep answering, but submitting needs a connection.
			</p>
		{/if}

		<Button loading={submitting} onclick={handleSubmit}>
			Submit Test
		</Button>

	{:else if !test.revealed}
		<div
			class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
		>
			<Hourglass size={16} class="shrink-0" aria-hidden="true" />

			Submitted — your instructor hasn't revealed the results yet. Check back later.
		</div>

		<PaginatedQuestions
			{questionUnits}
			mode="locked"
		/>

	{:else}
		<div
			class="flex items-center gap-3 rounded-lg border border-instructor-200 bg-instructor-50 p-4 text-instructor-800"
		>
			<Award size={20} class="shrink-0" aria-hidden="true" />

			<p class="text-sm">
				Revealed — you scored

				<span class="font-mono-nums font-display text-lg font-semibold">
					{test.myAttempt?.score}/{test.myAttempt?.totalQuestions ?? totalQuestions}
				</span>
			</p>
		</div>

		<PaginatedQuestions
			{questionUnits}
			mode="review"
		/>
	{/if}
</div>

