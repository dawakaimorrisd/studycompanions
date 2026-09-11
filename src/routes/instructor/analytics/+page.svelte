<script lang="ts">
	// Phase 16 - course-level only, deliberately no chapter breakdown (see
	// api/instructor.ts's comment on getCourseAnalytics/getMyAnalytics).
	import { getMyAnalytics, type AnalyticsPeriod } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { formatDuration } from '$lib/format';
	import type { MyAnalyticsResponse } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import InstructorNav from '$lib/components/InstructorNav.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';

	let period = $state<AnalyticsPeriod>('week');
	let data = $state<MyAnalyticsResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			data = await getMyAnalytics(period);
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Could not load your analytics.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		period; // re-run on period change
		load();
	});

	const sortedCourses = $derived(
		data ? [...data.courses].sort((a, b) => b.totalStudySeconds - a.totalStudySeconds) : []
	);
</script>

<svelte:head>
	<title>Analytics — Study Companion</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader title="Analytics" subtitle="Study activity across your courses" />
	<InstructorNav />

	<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
		<SegmentedToggle
			options={[
				{ label: 'Today', value: 'today' },
				{ label: 'This Week', value: 'week' },
				{ label: 'This Month', value: 'month' }
			]}
			bind:value={period}
		/>

		{#if loading}
			<p class="mt-6 text-sm text-gray-500">Loading…</p>
		{:else if error}
			<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				<p>{error}</p>
				<button type="button" class="mt-1 font-medium underline underline-offset-2" onclick={load}>
					Retry
				</button>
			</div>
		{:else if sortedCourses.length === 0}
			<div class="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
				<ChartNoAxesColumn size={22} class="mx-auto text-gray-300" aria-hidden="true" />
				<p class="mt-2 font-medium text-gray-700">No activity yet</p>
				<p class="mt-1 text-sm text-gray-500">Nothing to show for this period.</p>
			</div>
		{:else}
			<div class="mt-6 flex flex-col gap-2">
				{#each sortedCourses as course (course.courseId)}
					<a
						href={`/instructor/courses/${course.courseId}/analytics`}
						class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface px-5 py-4 hover:bg-gray-50"
					>
						<div class="min-w-0">
							<p class="truncate font-medium text-gray-900">{course.courseName}</p>
							<p class="mt-0.5 text-sm text-gray-500">
								{course.activeStudentCount} active student{course.activeStudentCount === 1 ? '' : 's'}
							</p>
						</div>
						<p class="shrink-0 text-lg font-semibold text-instructor-700">
							{formatDuration(course.totalStudySeconds)}
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</main>
</div>
