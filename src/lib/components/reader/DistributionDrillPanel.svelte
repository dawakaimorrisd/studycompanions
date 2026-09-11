<script lang="ts">
	/**
	 * Real, server-gated drill for a received distribution - as of v3 this
	 * mirrors AssignmentDrillPanel exactly: start an attempt, answer,
	 * submit, get the score and per-question correctOption/explanation
	 * back from the response. `correctOption`/`explanation` on the
	 * distribution's own questionUnits are null until an attempt is
	 * finished server-side (real gating - see api/submissions.ts). Unlike
	 * the earlier version of this component, there's nothing cosmetic
	 * here anymore: the answer key genuinely isn't in the page's data
	 * until the student earns it by submitting an attempt.
	 */
	import type {
	DistributionDrillSubmitResult,
	OptionKey,
	QuestionUnit,
	ReceivedDistribution
} from '$lib/types';

import {
	startDistributionDrill,
	submitDistributionDrill
} from '$lib/api/submissions';
	import { ApiError } from '$lib/api/client';
	import { network } from '$lib/offline/network.svelte';

	import PaginatedQuestions from './PaginatedQuestions.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormError from '$lib/components/FormError.svelte';

	import Target from '@lucide/svelte/icons/target';
	import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Award from '@lucide/svelte/icons/award';

	interface Props {
		distribution: ReceivedDistribution;
	}

	let { distribution }: Props = $props();

	const questionUnits = $derived(distribution.questionUnits);
	const totalQuestions = $derived(questionUnits.length);
	const drills = $derived(distribution.drills);

	let phase = $state<'idle' | 'in-progress' | 'just-submitted'>('idle');
	let selections = $state<Record<string, OptionKey | undefined>>({});
	let submitResult = $state<DistributionDrillSubmitResult | null>(null);
	let starting = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	/** Every question already ungated (a prior attempt on this distribution has been finished) - same "already revealed" idle state as AssignmentDrillPanel. */
	const alreadyRevealed = $derived(questionUnits.some((unit) => unit.correctOption !== null));

	const drillUnits = $derived(
		questionUnits.map((unit): QuestionUnit => ({ ...unit, correctOption: null, explanation: null }))
	);

	const reviewUnits = $derived.by(() => {
		const result = submitResult;
		if (result === null) return [];
		return questionUnits.map((unit): QuestionUnit => {
			const answer = result.answers.find((a) => a.questionUnitId === unit.id);
			return answer
				? { ...unit, correctOption: answer.correctOption, explanation: answer.explanation }
				: { ...unit, correctOption: null, explanation: null };
		});
	});

	const pickedOptions = $derived.by(() => {
		const result = submitResult;
		if (result === null) return {};
		const picked: Record<string, OptionKey | undefined> = {};
		for (const answer of result.answers) picked[answer.questionUnitId] = answer.selectedOption;
		return picked;
	});

	function describeError(err: unknown, action: string): string {
		if (err instanceof ApiError) {
			return err.networkFailure ? `You'll need to be online to ${action}.` : err.message;
		}
		return `Could not ${action}. Please try again.`;
	}

	async function handleStart() {
		if (starting || submitting) return;
		error = null;
		starting = true;
		try {
			await startDistributionDrill(distribution.distributionId);
			selections = {};
			submitResult = null;
			phase = 'in-progress';
		} catch (err) {
			error = describeError(err, 'start the drill');
		} finally {
			starting = false;
		}
	}

	async function handleSubmit() {
		if (submitting || starting) return;
		error = null;

		const answered = Object.values(selections).filter((v): v is OptionKey => v !== undefined).length;
		if (answered < totalQuestions) {
			error = `Answer every question before submitting (${answered}/${totalQuestions} so far).`;
			return;
		}

		submitting = true;
		try {
			const answers = drillUnits.map((unit) => {
				const selectedOption = selections[unit.id];
				if (!selectedOption) throw new Error(`Question ${unit.id} is missing an answer.`);
				return { questionUnitId: unit.id, selectedOption };
			});

			const result = await submitDistributionDrill(distribution.distributionId, answers);
			submitResult = result;
			phase = 'just-submitted';
		} catch (err) {
			error = describeError(err, 'submit the drill');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	{#if totalQuestions === 0}
		<div class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
			No questions here yet.
		</div>
	{:else}
		{#if drills.completedCount > 0}
			<p class="flex items-center gap-1.5 text-sm text-gray-500">
				<Trophy size={14} class="shrink-0 text-gray-400" aria-hidden="true" />
				Completed {drills.completedCount} {drills.completedCount === 1 ? 'time' : 'times'}
				{#if drills.bestScore !== null}
					· best score
					<span class="font-mono-nums">{drills.bestScore}/{drills.totalQuestions}</span>
				{/if}
			</p>
		{/if}

		{#if phase === 'idle' && !alreadyRevealed}
			<div class="rounded-lg border border-dashed border-gray-300 p-8 text-center">
				<Target size={22} class="mx-auto text-gray-400" aria-hidden="true" />
				<p class="mt-2 font-medium text-gray-700">Ready to drill?</p>
				<p class="mt-1 text-sm text-gray-500">
					Answer every question, then submit to see your score and the correct answers.
				</p>
				{#if error}
					<div class="mt-3"><FormError message={error} /></div>
				{/if}
				{#if !network.online}
					<p class="mt-3 text-xs text-gray-500">You'll need to be online to start a drill.</p>
				{/if}
				<Button class="mt-4" loading={starting} onclick={handleStart}>Start Drill</Button>
			</div>
		{:else if phase === 'idle' && alreadyRevealed}
			<PaginatedQuestions {questionUnits} mode="review" />
			{#if error}
				<FormError message={error} />
			{/if}
			<Button variant="secondary" loading={starting} onclick={handleStart}>
				<RefreshCcw size={15} aria-hidden="true" />
				Start a New Drill
			</Button>
		{:else if phase === 'in-progress'}
			<PaginatedQuestions questionUnits={drillUnits} mode="select" bind:selections />
			{#if error}
				<FormError message={error} />
			{/if}
			{#if !network.online}
				<p class="text-xs text-gray-500">You're offline - you can keep answering, but submitting needs a connection.</p>
			{/if}
			<Button loading={submitting} onclick={handleSubmit}>Submit Drill</Button>
		{:else if phase === 'just-submitted' && submitResult !== null}
			<div class="flex items-center gap-3 rounded-lg border border-instructor-200 bg-instructor-50 px-4 py-3 text-instructor-800">
				<Award size={20} class="shrink-0" aria-hidden="true" />
				<p class="text-sm">
					You scored
					<span class="font-mono-nums font-display text-lg font-semibold">
						{submitResult.score}/{submitResult.totalQuestions}
					</span>
				</p>
			</div>
			<PaginatedQuestions questionUnits={reviewUnits} mode="review" {pickedOptions} />
			<Button variant="secondary" loading={starting} onclick={handleStart}>
				<RefreshCcw size={15} aria-hidden="true" />
				Start a New Drill
			</Button>
		{/if}
	{/if}
</div>
