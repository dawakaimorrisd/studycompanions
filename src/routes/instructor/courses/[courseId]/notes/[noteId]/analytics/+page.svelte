
<script lang="ts">
	import { page } from '$app/state';
	import { getNoteResults } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type {
		InstructorNoteResults,
		InstructorQuestionAnalytics
	} from '$lib/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';

	const courseId = $derived(page.params.courseId as string);
	const noteId = $derived(page.params.noteId as string);
	const course = $derived(instructorCourses.find(courseId));

	let results = $state<InstructorNoteResults | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load(id: string) {
		loading = true;
		error = null;

		try {
			results = await getNoteResults(id);
		} catch (err) {
			error =
				err instanceof ApiError
					? err.message
					: 'Could not load test analytics.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		load(noteId);
	});

	function percentage(value: number) {
		return `${Math.round(value)}%`;
	}

	function label(
		performance: InstructorQuestionAnalytics['performance']
	) {
		if (performance === 'strong') return 'Strong';
		if (performance === 'middle') return 'Middle';
		return 'Needs Focus';
	}
</script>

<svelte:head>
	<title>
		{results ? `${results.note.title} — Test Analytics` : 'Test Analytics'} —
		Study Companion
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader
		title="Test Analytics"
		subtitle={results?.note.title ?? undefined}
	/>

	<main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		<a
			href={`/instructor/courses/${courseId}/notes/${noteId}/results`}
			class="text-sm font-medium text-gray-500 hover:text-gray-700"
		>
			&larr; Test Results
		</a>

		{#if loading}
			<p class="mt-6 text-sm text-gray-500">Loading…</p>
		{:else if error}
			<div
				class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
			>
				<p>{error}</p>

				<button
					type="button"
					class="mt-1 font-medium underline underline-offset-2"
					onclick={() => load(noteId)}
				>
					Retry
				</button>
			</div>
		{:else if results}
			<div class="mt-6">
				<p class="text-sm font-medium text-gray-500">
					{results.note.chapterLabel ?? results.note.title}
				</p>

				<h1 class="mt-1 font-display text-2xl font-semibold text-gray-900">
					Question-by-question performance
				</h1>

				<p class="mt-1 text-sm text-gray-500">
					Use this report to identify the concepts your class understands
					and the areas that need more teaching attention.
				</p>
			</div>

			<!-- OVERALL PERFORMANCE -->
			<section class="mt-8">
				<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">
					Overall Performance
				</h2>

				<div class="mt-3 grid gap-3 sm:grid-cols-4">
					<div class="rounded-xl border border-gray-200 bg-surface p-5">
						<p class="text-sm text-gray-500">Submitted</p>

						<p class="mt-2 font-display text-3xl font-semibold text-gray-900">
							{results.summary.submitted}
							<span class="text-base text-gray-400">
								/{results.summary.totalStudents}
							</span>
						</p>
					</div>

					<div class="rounded-xl border border-gray-200 bg-surface p-5">
						<p class="text-sm text-gray-500">Average Score</p>

						<p class="mt-2 font-display text-3xl font-semibold text-gray-900">
							{results.summary.averageScore.toFixed(1)}
							<span class="text-base text-gray-400">
								/{results.note.totalQuestions}
							</span>
						</p>
					</div>

					<div class="rounded-xl border border-gray-200 bg-surface p-5">
						<p class="text-sm text-gray-500">Average Percentage</p>

						<p class="mt-2 font-display text-3xl font-semibold text-gray-900">
							{percentage(results.summary.averagePercentage)}
						</p>
					</div>

					<div class="rounded-xl border border-gray-200 bg-surface p-5">
						<p class="text-sm text-gray-500">Needs Attention</p>

						<p class="mt-2 font-display text-3xl font-semibold text-gray-900">
							{results.questionGroups.weak.length}
						</p>

						<p class="mt-1 text-xs text-gray-400">
							questions below 40%
						</p>
					</div>
				</div>
			</section>

			<!-- NEEDS FOCUS -->
			<section class="mt-10">
				<div>
					<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">
						Needs Focus
					</h2>

					<p class="mt-1 text-sm text-gray-500">
						Questions where students struggled most. These are the areas
						to prioritize when reviewing the material.
					</p>
				</div>

				{#if results.questionGroups.weak.length === 0}
					<div class="mt-3 rounded-xl border border-gray-200 bg-surface p-6">
						<p class="text-sm text-gray-500">
							No questions currently need focused review.
						</p>
					</div>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
						{#each results.questionGroups.weak as question}
							<div
								class="rounded-xl border border-gray-200 bg-surface px-5 py-4"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0">
										<p class="text-xs font-medium text-gray-400">
											Question {question.number}
										</p>

										<p class="mt-1 font-medium text-gray-900">
											{question.question}
										</p>

										<p class="mt-2 text-xs text-gray-500">
											{question.correct} correct ·
											{question.wrong} incorrect ·
											{question.answered} answered
										</p>
									</div>

									<div class="shrink-0 text-right">
										<p class="text-lg font-semibold text-gray-900">
											{percentage(question.correctPercentage)}
										</p>

										<Badge tone="neutral">
											{label(question.performance)}
										</Badge>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- MIDDLE -->
			<section class="mt-10">
				<div>
					<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">
						Middle Performance
					</h2>

					<p class="mt-1 text-sm text-gray-500">
						Questions where understanding was mixed.
					</p>
				</div>

				{#if results.questionGroups.middle.length === 0}
					<div class="mt-3 rounded-xl border border-gray-200 bg-surface p-6">
						<p class="text-sm text-gray-500">
							No questions fall into the middle-performance range.
						</p>
					</div>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
						{#each results.questionGroups.middle as question}
							<div
								class="rounded-xl border border-gray-200 bg-surface px-5 py-4"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0">
										<p class="text-xs font-medium text-gray-400">
											Question {question.number}
										</p>

										<p class="mt-1 font-medium text-gray-900">
											{question.question}
										</p>

										<p class="mt-2 text-xs text-gray-500">
											{question.correct} correct ·
											{question.wrong} incorrect ·
											{question.answered} answered
										</p>
									</div>

									<div class="shrink-0 text-right">
										<p class="text-lg font-semibold text-gray-900">
											{percentage(question.correctPercentage)}
										</p>

										<Badge tone="brand">
											{label(question.performance)}
										</Badge>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- STRONG -->
			<section class="mt-10">
				<div>
					<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">
						Strong Understanding
					</h2>

					<p class="mt-1 text-sm text-gray-500">
						Questions where the class demonstrated strong understanding.
					</p>
				</div>

				{#if results.questionGroups.strong.length === 0}
					<div class="mt-3 rounded-xl border border-gray-200 bg-surface p-6">
						<p class="text-sm text-gray-500">
							No questions currently fall into the strong-performance range.
						</p>
					</div>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
						{#each results.questionGroups.strong as question}
							<div
								class="rounded-xl border border-gray-200 bg-surface px-5 py-4"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="min-w-0">
										<p class="text-xs font-medium text-gray-400">
											Question {question.number}
										</p>

										<p class="mt-1 font-medium text-gray-900">
											{question.question}
										</p>

										<p class="mt-2 text-xs text-gray-500">
											{question.correct} correct ·
											{question.wrong} incorrect ·
											{question.answered} answered
										</p>
									</div>

									<div class="shrink-0 text-right">
										<p class="text-lg font-semibold text-gray-900">
											{percentage(question.correctPercentage)}
										</p>

										<Badge tone="success">
											{label(question.performance)}
										</Badge>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- BACK TO RESULTS -->
			<div class="mt-10 border-t border-gray-200 pt-6">
				<a
					href={`/instructor/courses/${courseId}/notes/${noteId}/results`}
					class="text-sm font-medium text-instructor-700 hover:text-instructor-800"
				>
					&larr; Back to Test Results
				</a>
			</div>
		{/if}
	</main>
</div>

