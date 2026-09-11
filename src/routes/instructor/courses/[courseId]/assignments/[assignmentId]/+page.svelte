<script lang="ts">
	// Read-only. Instructor never creates, generates, or uploads homework -
	// students submit their own (individually or as a group); this page is
	// purely for viewing what came in. No publish concept applies here
	// anymore either - a student's submission is visible the moment it's
	// made, there's no separate release step.
	import { page } from '$app/state';
	import { getAssignment } from '$lib/api/content';
	import { ApiError } from '$lib/api/client';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type { AssignmentDetailContent } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import PdfViewer from '$lib/components/PdfViewer.svelte';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Users from '@lucide/svelte/icons/users';
	import User from '@lucide/svelte/icons/user';

	const courseId = $derived(page.params.courseId as string);
	const assignmentId = $derived(page.params.assignmentId as string);
	const course = $derived(instructorCourses.find(courseId));

	let assignment = $state<AssignmentDetailContent | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	async function load() {
		loading = true;
		loadError = null;
		try {
			assignment = await getAssignment(assignmentId);
		} catch (err) {
			loadError = err instanceof ApiError ? err.message : 'Could not load this assignment.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		load();
	});
</script>

<svelte:head>
	<title>{assignment?.title ?? 'Assignment'} — Study Companion</title>
</svelte:head>

<AppHeader
	title={assignment?.title ?? 'Assignment'}
	subtitle={course ? `${course.name} · ${course.courseCode}` : undefined}
	backHref={`/instructor/courses/${courseId}`}
	backLabel="Back to course"
/>

<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	{#if loading}
		<p class="text-sm text-gray-500">Loading…</p>
	{:else if loadError}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<p>{loadError}</p>
			<button type="button" class="mt-1 font-medium underline underline-offset-2" onclick={load}>
				Retry
			</button>
		</div>
	{:else if assignment}
		
<div class="flex flex-wrap items-center justify-between gap-3">
	<div class="flex items-center gap-2">
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

		{#if assignment.generatedAt !== null}
			<Badge tone="brand">Generated</Badge>
		{/if}
	</div>
</div>

<div class="mt-5 rounded-xl border border-gray-200 bg-surface px-5 py-4">
	<div class="flex items-start gap-3">
		<User
			size={18}
			class="mt-0.5 shrink-0 text-gray-400"
			aria-hidden="true"
		/>

		<div class="min-w-0">
			<p class="text-xs font-medium uppercase tracking-wide text-gray-400">
				Submitted by
			</p>

			<p class="mt-1 font-medium text-gray-800">
				{assignment.submittedBy?.name ?? 'Unknown student'}
			</p>

			{#if assignment.submittedBy?.studentCode}
				<p class="mt-0.5 text-sm text-gray-500">
					{assignment.submittedBy.studentCode}
				</p>
			{/if}
		</div>
	</div>

	{#if assignment.type === 'GROUP'}
		<div class="mt-4 border-t border-gray-100 pt-4">
			<div class="flex items-start gap-3">
				<Users
					size={18}
					class="mt-0.5 shrink-0 text-gray-400"
					aria-hidden="true"
				/>

				<div class="min-w-0">
					<p class="text-xs font-medium uppercase tracking-wide text-gray-400">
						Group
					</p>

					<p class="mt-1 font-medium text-gray-800">
						{assignment.groupName ?? 'Unnamed group'}
					</p>

					{#if assignment.members?.length}
						<p class="mt-2 text-sm text-gray-500">
							{assignment.members.length}
							{assignment.members.length === 1 ? 'member' : 'members'}
						</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>



		<div class="mt-6">
			<PdfViewer
				pdfUrl={assignment.pdfUrl}
				fileName={assignment.title}
				unavailableMessage={assignment.pdfConversionError ?? "This file's preview isn't available yet."}
			/>
		</div>

		<div class="mt-6 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface p-5">
			<p class="flex items-center gap-2 text-sm text-gray-600">
				<CheckCircle2 size={18} class="text-instructor-500" aria-hidden="true" />
				Submitted {new Date(assignment.createdAt).toLocaleDateString()}
			</p>
			<a
				href={`/instructor/courses/${courseId}/assignments/${assignmentId}/submissions`}
				class="shrink-0 text-sm font-medium text-instructor-700 hover:text-instructor-800"
			>
				View submissions &rarr;
			</a>
		</div>
	{/if}
</main>
