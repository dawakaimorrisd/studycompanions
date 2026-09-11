<script lang="ts">
	// Read-only instructor view.
	//
	// The current Assignment model treats the Assignment itself as the
	// student's submitted homework. There is no separate nested
	// /submissions endpoint.
	//
	// This page is intentionally metadata-only. The PDF is displayed on
	// the parent assignment page, not again here.

	import { page } from '$app/state';
	import { getCourseAssignments } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type { InstructorAssignmentSummary } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';

	import Users from '@lucide/svelte/icons/users';
	import User from '@lucide/svelte/icons/user';

	const courseId = $derived(page.params.courseId as string);
	const assignmentId = $derived(page.params.assignmentId as string);
	const course = $derived(instructorCourses.find(courseId));

	let assignment = $state<InstructorAssignmentSummary | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;

		try {
			const res = await getCourseAssignments(courseId);

			assignment =
				res.assignments.find((a) => a.id === assignmentId) ?? null;

			if (!assignment) {
				error = 'Assignment not found.';
			}
		} catch (err) {
			error =
				err instanceof ApiError
					? err.message
					: 'Could not load assignment.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		load();
	});

	function formatDateTime(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Submission — Study Companion</title>
</svelte:head>

<AppHeader
	title="Submission"
	subtitle={course ? `${course.name} · ${course.courseCode}` : undefined}
	backHref={`/instructor/courses/${courseId}/assignments/${assignmentId}`}
	backLabel="Back to assignment"
/>

<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	{#if loading}
		<p class="text-sm text-gray-500">Loading…</p>

	{:else if error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<p>{error}</p>

			<button
				type="button"
				class="mt-1 font-medium underline underline-offset-2"
				onclick={load}
			>
				Retry
			</button>
		</div>

	{:else if assignment}
		<div class="rounded-xl border border-gray-200 bg-surface p-5">
			<div class="flex flex-wrap items-start gap-4">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<Badge tone="neutral">
							<span class="flex items-center gap-1">
								{#if assignment.type === 'GROUP'}
									<Users size={11} aria-hidden="true" />
									Group
								{:else}
									<User size={11} aria-hidden="true" />
									Individual
								{/if}
							</span>
						</Badge>

						{#if assignment.groupName}
							<p class="font-medium text-gray-900">
								{assignment.groupName}
							</p>
						{:else}
							<p class="font-medium text-gray-900">
								{assignment.submittedBy.name}
							</p>
						{/if}
					</div>

					<h2 class="mt-3 text-lg font-semibold text-gray-900">
						{assignment.title}
					</h2>

					<p class="mt-1 text-sm text-gray-500">
						Submitted by {assignment.submittedBy.name}
						({assignment.submittedBy.studentCode})
						· {formatDateTime(assignment.submittedAt)}
					</p>

					{#if assignment.members.length > 0}
						<p class="mt-1 text-sm text-gray-500">
							Members:
							{assignment.members.map((member) => member.name).join(', ')}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="rounded-xl border border-dashed border-gray-300 p-10 text-center">
			<p class="font-medium text-gray-700">
				Submission not found
			</p>
		</div>
	{/if}
</main>