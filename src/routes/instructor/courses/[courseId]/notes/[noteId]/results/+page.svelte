
<script lang="ts">
	import { page } from '$app/state';
	import { getNoteResults, revealNoteTest } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type { InstructorNoteResults } from '$lib/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';

	const courseId = $derived(page.params.courseId as string);
	const noteId = $derived(page.params.noteId as string);
	const course = $derived(instructorCourses.find(courseId));

	let results = $state<InstructorNoteResults | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let revealing = $state(false);

	async function load(id: string) {
		loading = true;
		error = null;

		try {
			results = await getNoteResults(id);
		} catch (err) {
			error =
				err instanceof ApiError
					? err.message
					: 'Could not load results for this test.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		load(noteId);
	});

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function handleReveal() {
		revealing = true;

		try {
			await revealNoteTest(noteId);
			await load(noteId);
			toasts.success('Results released to students.');
		} catch (err) {
			toasts.error(
				err instanceof ApiError
					? err.message
					: 'Could not release results.'
			);
		} finally {
			revealing = false;
		}
	}
</script>

<svelte:head>
	<title>
		{results ? `${results.note.title} — Test Results` : 'Test Results'} —
		Study Companion
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader
		title={results?.note.title ?? 'Test Results'}
		subtitle={results?.note.chapterLabel ?? undefined}
	/>

	<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
		<a
			href={`/instructor/courses/${courseId}`}
			class="text-sm font-medium text-gray-500 hover:text-gray-700"
		>
			&larr; {course?.name ?? 'Course'}
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
			<!-- TEST STATUS -->
			<div
				class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface px-5 py-4"
			>
				<div class="flex items-center gap-3">
					{#if results.note.test.revealed}
						<Badge tone="success">Revealed to students</Badge>
					{:else if results.note.test.started}
						<Badge tone="brand">Test open</Badge>
					{:else}
						<Badge tone="neutral">Not started</Badge>
					{/if}

					<p class="text-sm text-gray-500">
						{results.summary.submitted} of {results.summary.totalStudents}
						submitted
					</p>
				</div>

				{#if results.note.test.started && !results.note.test.revealed}
					<Button
						tone="instructor"
						loading={revealing}
						disabled={revealing}
						onclick={handleReveal}
					>
						Release results
					</Button>
				{/if}
			</div>

			<!-- STUDENTS WHO SUBMITTED -->
			<section class="mt-8">
				<div class="flex items-center justify-between">
					<div>
						<h2
							class="text-sm font-semibold tracking-wide text-gray-500 uppercase"
						>
							Submitted Students
						</h2>

						<p class="mt-1 text-sm text-gray-500">
							Students who have completed this test.
						</p>
					</div>

					<span class="text-sm font-medium text-gray-500">
						{results.summary.submitted}
					</span>
				</div>

				{#if results.submitted.length === 0}
					<div
						class="mt-3 rounded-xl border border-dashed border-gray-300 p-8 text-center"
					>
						<p class="text-sm text-gray-500">
							No students have submitted yet.
						</p>
					</div>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
						{#each results.submitted as row (row.studentId)}
							<div
								class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-surface px-5 py-4"
							>
								<div class="min-w-0">
									<p class="truncate font-medium text-gray-900">
										{row.studentName}
									</p>

									<p class="mt-0.5 truncate text-sm text-gray-500">
										{row.studentCode}
									</p>

									<p class="mt-1 text-xs text-gray-400">
										Submitted {formatDate(row.submittedAt)}
									</p>
								</div>

								<div class="shrink-0 text-right">
									<p class="text-lg font-semibold text-gray-900">
										{row.score}/{row.totalQuestions}
									</p>

									<p class="text-xs text-gray-400">
										{Math.round(
											(row.score / row.totalQuestions) * 100
										)}%
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- STUDENTS WHO HAVE NOT SUBMITTED -->
			<section class="mt-8">
				<div class="flex items-center justify-between">
					<div>
						<h2
							class="text-sm font-semibold tracking-wide text-gray-500 uppercase"
						>
							Not Yet Submitted
						</h2>

						<p class="mt-1 text-sm text-gray-500">
							Students who have not completed this test.
						</p>
					</div>

					<span class="text-sm font-medium text-gray-500">
						{results.summary.notYetSubmitted}
					</span>
				</div>

				{#if results.notYetSubmitted.length === 0}
					<div
						class="mt-3 rounded-xl border border-gray-200 bg-surface px-5 py-4"
					>
						<p class="text-sm text-gray-500">
							Everyone has submitted.
						</p>
					</div>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
						{#each results.notYetSubmitted as row (row.studentId)}
							<div
								class="rounded-xl border border-gray-200 bg-surface px-5 py-4"
							>
								<p class="font-medium text-gray-900">
									{row.studentName}
								</p>

								<p class="mt-0.5 text-sm text-gray-500">
									{row.studentCode}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- LINK TO ANALYTICS -->
			<div class="mt-10 border-t border-gray-200 pt-6">
				<a
					href={`/instructor/courses/${courseId}/notes/${noteId}/analytics`}
					class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-surface px-5 py-3 text-sm font-medium text-instructor-700 transition hover:border-instructor-300 hover:shadow-sm"
				>
					<BarChart3 size={16} aria-hidden="true" />
					View Test Analytics
				</a>
			</div>
		{/if}
	</main>
</div>

