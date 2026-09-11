
<script lang="ts">
	import type {
		AssignmentContent,
		OptionKey,
		QuestionUnit
	} from '$lib/types';

	import { generateSubmission } from '$lib/api/submissions';
	import { ApiError } from '$lib/api/client';
	import { network } from '$lib/offline/network.svelte';

	import PaginatedQuestions from './PaginatedQuestions.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormError from '$lib/components/FormError.svelte';

	import Target from '@lucide/svelte/icons/target';
	import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Award from '@lucide/svelte/icons/award';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import KeyRound from '@lucide/svelte/icons/key-round';

	interface Props {
		assignment: AssignmentContent;
		submissionId?: string;
		onGenerated?: (
			generatedAt: string,
			questionUnits: QuestionUnit[]
		) => void;
		onSubmitted?: () => void;
		onDrillStateChange?: (active: boolean) => void;
	}

	let {
		assignment,
		submissionId,
		onGenerated,
		onSubmitted,
		onDrillStateChange
	}: Props = $props();
/*
 * These are SAFE frontend labels only.
 *
 * They are NOT Groq API secrets.
 *
 * The backend maps these labels to the actual environment
 * variables/secrets through config.getGroqApiKeyByLabel().
 */
const groqKeys = [
	{ value: 'Groq Key 1', label: 'Groq Key 1' },
	{ value: 'Groq Key 2', label: 'Groq Key 2' },
	{ value: 'Groq Key 3', label: 'Groq Key 3' },
	{ value: 'Groq Key 4', label: 'Groq Key 4' },
	{ value: 'Groq Key 5', label: 'Groq Key 5' }
] as const;

type GroqKeyLabel = (typeof groqKeys)[number]['value'];

let selectedGroqKey =
	$state<GroqKeyLabel>('Groq Key 1');


	const questionUnits = $derived(
		assignment?.questionUnits ?? []
	);

	const totalQuestions = $derived(
		questionUnits.length
	);

	const generated = $derived(
		Boolean(
			assignment?.generatedAt &&
			questionUnits.length > 0
		)
	);

	let phase = $state<
		'idle' | 'in-progress' | 'submitted'
	>('idle');

	let selections = $state<
		Record<string, OptionKey | undefined>
	>({});

	let score = $state<number | null>(null);

	let generating = $state(false);
	let starting = $state(false);
	let submitting = $state(false);

	let error = $state<string | null>(null);

	let localCompletedCount = $state(0);
	let localBestScore = $state<number | null>(null);

	/*
	 * Never expose the correct answer while the student is taking
	 * the drill.
	 */
	const drillUnits = $derived(
		questionUnits.map(
			(unit): QuestionUnit => ({
				...unit,
				correctOption: null,
				explanation: null
			})
		)
	);

	/*
	 * After the student ends the drill, show the original stored
	 * question units so correct answers and explanations are visible.
	 */
	const reviewUnits = $derived(
		phase === 'submitted'
			? questionUnits
			: []
	);

	function describeError(
		err: unknown,
		action: string
	): string {
		if (err instanceof ApiError) {
			if (err.networkFailure) {
				return `You'll need to be online to ${action}.`;
			}

			return err.message;
		}

		if (err instanceof Error) {
			return err.message;
		}

		return `Could not ${action}. Please try again.`;
	}

	/*
	 * Generate study material using the student's selected Groq key.
	 *
	 * The selected value is only a safe label such as "key2".
	 * The actual Groq API secret never reaches the browser.
	 */
	async function handleGenerate() {
		if (generating) return;

		if (!submissionId) {
			error =
				'Your submitted homework could not be found.';
			return;
		}

		if (!network.online) {
			error =
				'You need to be online to generate study material.';
			return;
		}

		error = null;
		generating = true;

		try {
			const result = await generateSubmission(
				submissionId,
				selectedGroqKey
			);

			/*
			 * Send the generated/stored material back to the
			 * assignment page so both the drill and dictionary
			 * immediately use the same questionUnits.
			 */
			onGenerated?.(
				result.generatedAt,
				result.questionUnits
			);

			/*
			 * Reset local drill state after generation.
			 */
			selections = {};
			score = null;
			phase = 'idle';
		} catch (err) {
			console.error(
				'[Assignment Drill] Generation failed:',
				err
			);

			error = describeError(
				err,
				'generate study material'
			);
		} finally {
			generating = false;
		}
	}

	/*
	 * Start the student's own drill.
	 *
	 * This is frontend-only.
	 * No backend /drill/start request is made.
	 */
	function handleStart() {
		if (
			starting ||
			submitting ||
			generating ||
			totalQuestions === 0
		) {
			return;
		}

		error = null;
		starting = true;

		try {
			selections = {};
			score = null;
			phase = 'in-progress';

			onDrillStateChange?.(true);
		} finally {
			starting = false;
		}
	}

	/*
	 * End the student's own drill.
	 *
	 * Score is calculated locally against the stored questionUnits.
	 * Nothing is submitted to the backend.
	 */
	function handleSubmit() {
		if (submitting || starting) return;

		error = null;

		const answered =
			Object.values(selections).filter(
				(value): value is OptionKey =>
					value !== undefined
			).length;

		if (answered < totalQuestions) {
			error =
				`Answer every question before ending the drill (${answered}/${totalQuestions} so far).`;
			return;
		}

		submitting = true;

		try {
			let correct = 0;

			for (const unit of questionUnits) {
				const selected =
					selections[unit.id];

				if (
					selected !== undefined &&
					selected === unit.correctOption
				) {
					correct += 1;
				}
			}

			score = correct;

			localCompletedCount += 1;

			if (
				localBestScore === null ||
				correct > localBestScore
			) {
				localBestScore = correct;
			}

			phase = 'submitted';

			onDrillStateChange?.(false);
			onSubmitted?.();
		} finally {
			submitting = false;
		}
	}

	const displayedCompletedCount = $derived(
		(assignment?.drills?.completedCount ?? 0) +
			localCompletedCount
	);

	const displayedBestScore = $derived.by(() => {
		const stored =
			assignment?.drills?.bestScore ?? null;

		if (
			stored === null &&
			localBestScore === null
		) {
			return null;
		}

		if (stored === null) {
			return localBestScore;
		}

		if (localBestScore === null) {
			return stored;
		}

		return Math.max(
			stored,
			localBestScore
		);
	});
</script>

<div class="flex flex-col gap-4">

	{#if !generated}
		<div
			class="rounded-lg border border-dashed border-gray-300 p-8 text-center"
		>
			<Sparkles
				size={24}
				class="mx-auto text-gray-400"
				aria-hidden="true"
			/>

			<p class="mt-2 font-medium text-gray-700">
				Generate Study Material
			</p>

			<p class="mx-auto mt-1 max-w-md text-sm text-gray-500">
				We'll turn your submitted homework into
				questions you can use for drills and your
				study dictionary.
			</p>

			<p class="mx-auto mt-2 max-w-md text-xs text-gray-400">
				You only need to generate this once. Your
				generated material will be saved and reused
				for future drills.
			</p>

			{#if error}
				<div class="mx-auto mt-4 max-w-md">
					<FormError message={error} />
				</div>
			{/if}

			{#if !submissionId}
				<p class="mx-auto mt-3 max-w-md text-xs text-red-600">
					Your submitted homework could not be found.
				</p>
			{:else if !network.online}
				<p class="mt-3 text-xs text-gray-500">
					You need to be online to generate study
					material.
				</p>
			{/if}

			{#if submissionId && network.online}
				<div
					class="mx-auto mt-5 max-w-md text-left"
				>
					<div class="mb-2 flex items-center gap-2">
						<KeyRound
							size={15}
							class="text-gray-500"
							aria-hidden="true"
						/>

						<label
							for="groq-generation-key"
							class="text-sm font-medium text-gray-700"
						>
							Choose generation key
						</label>
					</div>

					<select
						id="groq-generation-key"
						bind:value={selectedGroqKey}
						disabled={generating}
						class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#each groqKeys as key}
							<option value={key.value}>
								{key.label}
							</option>
						{/each}
					</select>

					<p class="mt-1.5 text-xs text-gray-400">
						If this key is busy or unavailable, you can
						try another key and generate again.
					</p>
				</div>
			{/if}

			<Button
				class="mt-4"
				loading={generating}
				disabled={
					!submissionId ||
					!network.online
				}
				onclick={handleGenerate}
			>
				<Sparkles
					size={15}
					aria-hidden="true"
				/>
				Generate Study Material
			</Button>
		</div>

	{:else if totalQuestions === 0}
		<div
			class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"
		>
			Study material was generated, but there are
			no questions available yet.
		</div>

	{:else}
		{#if displayedCompletedCount > 0}
			<p
				class="flex items-center gap-1.5 text-sm text-gray-500"
			>
				<Trophy
					size={14}
					class="shrink-0 text-gray-400"
					aria-hidden="true"
				/>

				Completed {displayedCompletedCount}
				{displayedCompletedCount === 1
					? 'time'
					: 'times'}

				{#if displayedBestScore !== null}
					· best score

					<span class="font-mono-nums">
						{displayedBestScore}/{totalQuestions}
					</span>
				{/if}
			</p>
		{/if}

		{#if phase === 'idle'}
			<div
				class="rounded-lg border border-dashed border-gray-300 p-8 text-center"
			>
				<Target
					size={22}
					class="mx-auto text-gray-400"
					aria-hidden="true"
				/>

				<p class="mt-2 font-medium text-gray-700">
					Ready to drill?
				</p>

				<p class="mt-1 text-sm text-gray-500">
					Your study material is already generated.
					Start a drill whenever you're ready.
				</p>

				<p class="mt-3 text-xs text-gray-400">
					Starting a drill does not generate anything
					new.
				</p>

				{#if error}
					<div class="mt-3">
						<FormError message={error} />
					</div>
				{/if}

				<Button
					class="mt-4"
					loading={starting}
					onclick={handleStart}
				>
					Start Drill
				</Button>
			</div>

		{:else if phase === 'in-progress'}
			<PaginatedQuestions
				questionUnits={drillUnits}
				mode="select"
				bind:selections
			/>

			{#if error}
				<FormError message={error} />
			{/if}

			<p class="text-xs text-gray-500">
				You can complete this drill offline.
				Your score is calculated on this device.
			</p>

			<Button
				loading={submitting}
				onclick={handleSubmit}
			>
				End Drill
			</Button>

		{:else if phase === 'submitted'}
			<div
				class="flex items-center gap-3 rounded-lg border border-instructor-200 bg-instructor-50 px-4 py-3 text-instructor-800"
			>
				<Award
					size={20}
					class="shrink-0"
					aria-hidden="true"
				/>

				<p class="text-sm">
					You scored

					<span
						class="font-mono-nums font-display text-lg font-semibold"
					>
						{score}/{totalQuestions}
					</span>
				</p>
			</div>

			<PaginatedQuestions
				questionUnits={reviewUnits}
				mode="review"
				{selections}
			/>

			<Button
				variant="secondary"
				loading={starting}
				onclick={handleStart}
			>
				<RefreshCcw
					size={15}
					aria-hidden="true"
				/>

				Start a New Drill
			</Button>
		{/if}
	{/if}
</div>

