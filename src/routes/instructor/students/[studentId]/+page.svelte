<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.svelte';
	import { getMyStudents } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import type { StudentSummary } from '$lib/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import InstructorNav from '$lib/components/InstructorNav.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Clock3 from '@lucide/svelte/icons/clock-3';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Trophy from '@lucide/svelte/icons/trophy';

	let students = $state<StudentSummary[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const studentId = $derived(page.params.studentId);

	async function load() {
		loading = true;
		error = null;

		try {
			const res = await getMyStudents();
			students = res.students;
		} catch (err) {
			error =
				err instanceof ApiError
					? err.message
					: 'Could not load student information.';
		} finally {
			loading = false;
		}
	}

	// onMount, not $effect - same reasoning as the instructor students
	// list page and both layouts: run the initial load exactly once.
	onMount(() => {
		load();
	});

	const student = $derived(
		students.find((item) => item.id === studentId) ?? null
	);

	function formatStudyTime(seconds: number) {
		if (seconds < 60) return `${seconds}s`;

		const minutes = Math.floor(seconds / 60);

		if (minutes < 60) return `${minutes}m`;

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		return remainingMinutes > 0
			? `${hours}h ${remainingMinutes}m`
			: `${hours}h`;
	}

	function formatDate(value: string | null) {
		if (!value) return 'Never';

		return new Date(value).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function engagementLabel(value: StudentSummary['engagement']) {
		if (value === 'engaged') return 'Engaged';
		if (value === 'moderate') return 'Moderate';
		return 'At Risk';
	}

	function engagementClasses(value: StudentSummary['engagement']) {
		if (value === 'engaged') {
			return 'bg-green-50 text-green-700 border-green-200';
		}

		if (value === 'moderate') {
			return 'bg-amber-50 text-amber-700 border-amber-200';
		}

		return 'bg-red-50 text-red-700 border-red-200';
	}

	function scorePercentage(score: number, total: number) {
		if (!total) return 0;
		return Math.round((score / total) * 100);
	}

	function scoreClasses(percentage: number) {
		if (percentage >= 70) return 'text-green-700';
		if (percentage >= 40) return 'text-amber-700';
		return 'text-red-700';
	}

	function dayLabel(index: number) {
		return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][index];
	}

	function maxWeeklyActivity() {
		if (!student) return 1;

		const values = student.weeklyActivityByDay;

		return Math.max(...values, 1);
	}

	function activityHeight(seconds: number) {
		return Math.max(6, Math.round((seconds / maxWeeklyActivity()) * 100));
	}
</script>

<svelte:head>
	<title>
		{student ? `${student.name} — Study Companion` : 'Student — Study Companion'}
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader
		title={student?.name ?? 'Student'}
		subtitle={student?.studentCode ?? session.current?.instructor?.name}
	/>

	<InstructorNav />

	<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
		{#if loading}
			<div class="flex items-center gap-2 text-sm text-gray-500">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-instructor-500"
				></div>
				Loading student…
			</div>

		{:else if error}
			<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
				<p>{error}</p>

				<button
					type="button"
					class="mt-2 font-medium underline underline-offset-2"
					onclick={load}
				>
					Retry
				</button>
			</div>

		{:else if !student}
			<div class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
				<p class="font-medium text-gray-800">Student not found</p>

				<p class="mt-1 text-sm text-gray-500">
					This student could not be found in your student list.
				</p>

				<a
					href="/instructor/students"
					class="mt-5 inline-flex items-center gap-2 text-sm font-medium text-instructor-600 hover:text-instructor-700"
				>
					<ArrowLeft size={16} aria-hidden="true" />
					Back to students
				</a>
			</div>

		{:else}
			<!-- BACK -->
			<a
				href="/instructor/students"
				class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
			>
				<ArrowLeft size={16} aria-hidden="true" />
				Back to students
			</a>

			<!-- STUDENT HEADER -->
			<section class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-3">
							<h1 class="font-display text-2xl font-semibold text-gray-900">
								{student.name}
							</h1>

							<span
								class={`rounded-full border px-2.5 py-1 text-xs font-medium ${engagementClasses(student.engagement)}`}
							>
								{engagementLabel(student.engagement)}
							</span>
						</div>

						<p class="mt-1 text-sm text-gray-500">
							Student ID: {student.studentCode}
						</p>
					</div>
				</div>
			</section>

			<!-- KEY METRICS -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-2xl border border-gray-200 bg-white p-5">
					<div class="flex items-center gap-2 text-gray-400">
						<Clock3 size={17} aria-hidden="true" />
						<span class="text-xs font-medium uppercase tracking-wide">
							Total study time
						</span>
					</div>

					<p class="mt-3 text-2xl font-semibold text-gray-900">
						{formatStudyTime(student.totalStudySeconds)}
					</p>
				</div>

				<div class="rounded-2xl border border-gray-200 bg-white p-5">
					<div class="flex items-center gap-2 text-gray-400">
						<CalendarDays size={17} aria-hidden="true" />
						<span class="text-xs font-medium uppercase tracking-wide">
							Last studied
						</span>
					</div>

					<p class="mt-3 text-2xl font-semibold text-gray-900">
						{formatDate(student.lastStudiedAt)}
					</p>
				</div>

				<div class="rounded-2xl border border-gray-200 bg-white p-5">
					<div class="flex items-center gap-2 text-gray-400">
						<BookOpen size={17} aria-hidden="true" />
						<span class="text-xs font-medium uppercase tracking-wide">
							Most studied
						</span>
					</div>

					{#if student.mostStudiedContent}
						<p class="mt-3 truncate text-lg font-semibold text-gray-900">
							{student.mostStudiedContent.title}
						</p>

						<p class="mt-1 text-xs text-gray-500">
							{formatStudyTime(student.mostStudiedContent.seconds)} studied
						</p>
					{:else}
						<p class="mt-3 text-lg font-semibold text-gray-400">No activity</p>
					{/if}
				</div>
			</div>

			<!-- ACTIVITY + ENGAGEMENT -->
			<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section class="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="font-semibold text-gray-900">Study activity</h2>
							<p class="mt-1 text-sm text-gray-500">
								Study time by day of the week.
							</p>
						</div>
					</div>

					<div class="mt-6 flex h-40 items-end justify-between gap-3">
						{#each student.weeklyActivityByDay as seconds, index}
							<div class="flex h-full flex-1 flex-col items-center justify-end gap-2">
								<div class="flex h-full w-full items-end justify-center">
									<div
										class="w-full max-w-8 rounded-t-md bg-instructor-500 transition"
										style={`height: ${activityHeight(seconds)}%`}
										title={`${formatStudyTime(seconds)} studied`}
									></div>
								</div>

								<span class="text-xs font-medium text-gray-400">
									{dayLabel(index)}
								</span>
							</div>
						{/each}
					</div>
				</section>

				<section class="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
					<h2 class="font-semibold text-gray-900">Learning overview</h2>

					<p class="mt-1 text-sm text-gray-500">
						A quick view of this student's current engagement.
					</p>

					<div class="mt-6 space-y-4">
						<div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-500">Engagement</span>

								<span class="font-medium text-gray-900">
									{engagementLabel(student.engagement)}
								</span>
							</div>

							<div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
								<div
									class="h-full rounded-full bg-instructor-500"
									style={`width: ${student.engagement === 'engaged' ? 100 : student.engagement === 'moderate' ? 60 : 30}%`}
								></div>
							</div>
						</div>

						<div class="flex items-center justify-between border-t border-gray-100 pt-4">
							<span class="text-sm text-gray-500">Chapter tests completed</span>

							<span class="font-semibold text-gray-900">
								{student.chapterTests.length}
							</span>
						</div>
					</div>
				</section>
			</div>

			<!-- CHAPTER TESTS -->
			<section class="mt-6 rounded-2xl border border-gray-200 bg-white">
				<div class="border-b border-gray-200 px-5 py-5 sm:px-6">
					<div class="flex items-center gap-2">
						<Trophy size={18} class="text-gray-400" aria-hidden="true" />

						<div>
							<h2 class="font-semibold text-gray-900">Chapter tests</h2>
							<p class="mt-1 text-sm text-gray-500">
								Revealed chapter-test performance for this student.
							</p>
						</div>
					</div>
				</div>

				{#if student.chapterTests.length === 0}
					<div class="px-5 py-10 text-center sm:px-6">
						<p class="font-medium text-gray-700">No chapter tests yet</p>

						<p class="mt-1 text-sm text-gray-500">
							Completed chapter tests will appear here.
						</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-100">
						{#each student.chapterTests as test}
							{@const percentage = scorePercentage(test.score, test.totalQuestions)}

							<div class="px-5 py-4 sm:px-6">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div class="min-w-0">
										<p class="font-medium text-gray-900">
											{test.chapterLabel ?? test.noteTitle}
										</p>

										<p class="mt-0.5 text-sm text-gray-500">
											{test.noteTitle}
										</p>

										<p class="mt-1 text-xs text-gray-400">
											Submitted {formatDate(test.submittedAt)}
										</p>
									</div>

									<div class="flex items-center gap-5">
										<div class="text-right">
											<p
												class={`text-lg font-semibold ${scoreClasses(percentage)}`}
											>
												{test.score}/{test.totalQuestions}
											</p>

											<p class="text-xs text-gray-400">
												{percentage}%
											</p>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</main>
</div>

