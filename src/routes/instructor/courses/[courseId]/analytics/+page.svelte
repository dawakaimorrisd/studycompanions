<script lang="ts">
	import { page } from '$app/state';
	import { getCourseAnalytics, type AnalyticsPeriod } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { formatDuration } from '$lib/format';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type { CourseAnalytics } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import Users from '@lucide/svelte/icons/users';

	const courseId = $derived(page.params.courseId as string);
	const course = $derived(instructorCourses.find(courseId));

	let period = $state<AnalyticsPeriod>('week');
	let data = $state<CourseAnalytics | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			data = await getCourseAnalytics(courseId, period);
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Could not load analytics for this course.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		courseId;
		period;
		load();
	});
</script>

<svelte:head>
	<title>{course ? `${course.name} analytics` : 'Analytics'} — Study Companion</title>
</svelte:head>

<AppHeader
	title="Analytics"
	subtitle={course ? `${course.name} · ${course.courseCode}` : undefined}
	backHref={`/instructor/courses/${courseId}`}
	backLabel="Back to course"
/>

<main class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
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
	{:else if data}
		<div class="mt-6 grid gap-4 sm:grid-cols-2">
			<div class="rounded-2xl border border-gray-200 bg-surface p-5">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<Clock size={21} class="text-gray-700" aria-hidden="true" />
				</div>
				<p class="mt-5 text-2xl font-bold text-gray-900">{formatDuration(data.totalStudySeconds)}</p>
				<p class="mt-1 text-sm font-medium text-gray-900">Total study time</p>
			</div>
			<div class="rounded-2xl border border-gray-200 bg-surface p-5">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<Users size={21} class="text-gray-700" aria-hidden="true" />
				</div>
				<p class="mt-5 text-2xl font-bold text-gray-900">{data.activeStudentCount}</p>
				<p class="mt-1 text-sm font-medium text-gray-900">Active students</p>
			</div>
		</div>
	{/if}
</main>
