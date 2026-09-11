<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getCourseContent, getCourseAssignments, startNoteTest, revealNoteTest } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type { InstructorNoteSummary, InstructorAssignmentSummary } from '$lib/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import InstructorNav from '$lib/components/InstructorNav.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import Play from '@lucide/svelte/icons/play';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Users from '@lucide/svelte/icons/users';
	import User from '@lucide/svelte/icons/user';

	const courseId = $derived(page.params.courseId as string);
	const course = $derived(instructorCourses.find(courseId));

	let section = $state<'notes' | 'assignments'>('notes');

	let notes = $state<InstructorNoteSummary[]>([]);
	let notesLoading = $state(true);
	let notesError = $state<string | null>(null);

	let assignments = $state<InstructorAssignmentSummary[]>([]);
	let assignmentsLoading = $state(true);
	let assignmentsError = $state<string | null>(null);

	// Which note currently has a Start/Reveal request in flight, so only
	// that row's button shows a loading state.
	let pendingNoteId = $state<string | null>(null);

	async function loadNotes(id: string) {
		notesLoading = true;
		notesError = null;
		try {
			const res = await getCourseContent(id);
			notes = res.notes ?? [];
		} catch (err) {
			notesError = err instanceof ApiError ? err.message : 'Could not load notes for this course.';
		} finally {
			notesLoading = false;
		}
	}

	async function loadAssignments(id: string) {
		assignmentsLoading = true;
		assignmentsError = null;
		try {
			const res = await getCourseAssignments(id);
			assignments = res.assignments ?? [];
		} catch (err) {
			assignmentsError = err instanceof ApiError ? err.message : 'Could not load assignments for this course.';
		} finally {
			assignmentsLoading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		loadNotes(courseId);
		loadAssignments(courseId);
	});

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// This is the instructor's one narrow exception to an otherwise
	// upload-only role for chapter tests specifically (Phase 9) - the
	// broader "Instructor never reads content" assumption from Phase 7/9
	// no longer holds as of Phase 12/13 (see the notes/assignments review
	// pages), but Start/Reveal Test still lives here in the course list
	// rather than on the review page, since it's a course-wide action
	// rather than part of reviewing one note's content.
	async function handleStart(noteId: string) {
		pendingNoteId = noteId;
		try {
			await startNoteTest(noteId);
			await loadNotes(courseId);
		} catch (err) {
			toasts.error(err instanceof ApiError ? err.message : 'Could not start the test.');
		} finally {
			pendingNoteId = null;
		}
	}

	async function handleReveal(noteId: string) {
		pendingNoteId = noteId;
		try {
			await revealNoteTest(noteId);
			await loadNotes(courseId);
		} catch (err) {
			toasts.error(err instanceof ApiError ? err.message : 'Could not reveal the test.');
		} finally {
			pendingNoteId = null;
		}
	}

	function tabColor(note: InstructorNoteSummary) {
		if (note.generatedAt === null) return 'bg-gray-300';
		if (note.publishedAt === null) return 'bg-amber-500';
		const t = note.test ?? { started: false, revealed: false };
		if (t.revealed) return 'bg-instructor-500';
		if (t.started) return 'bg-brand-500';
		return 'bg-gray-200';
	}

	function assignmentTabColor(a: InstructorAssignmentSummary) {
		return a.generatedAt === null ? 'bg-gray-300' : 'bg-instructor-500';
	}
</script>

<svelte:head>
	<title>{course ? `${course.name} — Study Companion` : 'Course — Study Companion'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader title={course?.name ?? 'Course'} subtitle={course?.courseCode} />
	<InstructorNav />

	<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
		<div class="mb-4 flex items-center justify-between">
			<a href="/instructor" class="text-sm font-medium text-gray-500 hover:text-gray-700">
				&larr; My Courses
			</a>
			<div class="flex items-center gap-3">
				<a
					href={`/instructor/courses/${courseId}/analytics`}
					class="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
				>
					<BarChart3 size={14} aria-hidden="true" />
					Analytics
				</a>
				{#if section === 'notes'}
					<Button tone="instructor" onclick={() => goto(`/instructor/courses/${courseId}/upload`)}>
						<Upload size={15} aria-hidden="true" />
						Upload Note
					</Button>
				{/if}
			</div>
		</div>

		<SegmentedToggle
			options={[
				{ label: 'Notes', value: 'notes' },
				{ label: 'Assignments', value: 'assignments' }
			]}
			bind:value={section}
		/>

		{#if section === 'notes'}
			{#if notesLoading}
				<p class="mt-6 text-sm text-gray-500">Loading…</p>
			{:else if notesError}
				<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<p>{notesError}</p>
					<button
						type="button"
						class="mt-1 font-medium underline underline-offset-2"
						onclick={() => loadNotes(courseId)}
					>
						Retry
					</button>
				</div>
			{:else if notes.length === 0}
				<div class="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
					<BookOpen size={22} class="mx-auto text-gray-300" aria-hidden="true" />
					<p class="mt-2 font-medium text-gray-700">No notes uploaded yet</p>
					<p class="mt-1 text-sm text-gray-500">Upload one to get started.</p>
				</div>
			{:else}
				<div class="mt-6 flex flex-col gap-2">
					{#each notes as note (note.id)}
						{@const noteTest = note.test ?? { started: false, revealed: false }}
						<div class="flex flex-wrap items-stretch justify-between gap-3 overflow-hidden rounded-xl border border-gray-200 bg-surface">
							<div class={`w-1 shrink-0 ${tabColor(note)}`} aria-hidden="true"></div>
							<a
								href={`/instructor/courses/${courseId}/notes/${note.id}`}
								class="min-w-0 flex-1 py-4 hover:bg-gray-50"
							>
								<div class="flex items-center gap-2">
									<p class="truncate font-medium text-gray-900">{note.title}</p>
									{#if note.chapterLabel}
										<span class="shrink-0 text-sm text-gray-400">· {note.chapterLabel}</span>
									{/if}
								</div>
								<p class="mt-0.5 text-sm text-gray-500">Uploaded {formatDate(note.createdAt)}</p>
							</a>

							<div class="flex shrink-0 items-center gap-2 py-4 pr-5">
								{#if note.generatedAt === null}
									<Badge tone="neutral">Not generated</Badge>
									<a
										href={`/instructor/courses/${courseId}/notes/${note.id}`}
										class="flex items-center gap-1.5 text-sm font-medium text-instructor-700 hover:text-instructor-800"
									>
										<Sparkles size={14} aria-hidden="true" />
										Set up
									</a>
								{:else if note.publishedAt === null}
									<Badge tone="warning">Ready to publish</Badge>
									<a
										href={`/instructor/courses/${courseId}/notes/${note.id}`}
										class="flex items-center gap-1.5 text-sm font-medium text-instructor-700 hover:text-instructor-800"
									>
										<Megaphone size={14} aria-hidden="true" />
										Review &amp; publish
									</a>
								{:else}
									{#if noteTest.revealed}
										<Badge tone="success">Test revealed</Badge>
									{:else if noteTest.started}
										<Badge tone="brand">Test in progress</Badge>
									{:else}
										<Badge tone="neutral">Test not started</Badge>
									{/if}

									{#if !noteTest.started}
										<Button
											variant="secondary"
											loading={pendingNoteId === note.id}
											disabled={pendingNoteId !== null}
											onclick={() => handleStart(note.id)}
										>
											<Play size={14} aria-hidden="true" />
											Start Test
										</Button>
									{:else}
										<a
											href={`/instructor/courses/${courseId}/notes/${note.id}/results`}
											class="flex items-center gap-1.5 text-sm font-medium text-instructor-700 hover:text-instructor-800"
										>
											<BarChart3 size={14} aria-hidden="true" />
											View results
										</a>
										{#if !noteTest.revealed}
											<Button
												variant="secondary"
												loading={pendingNoteId === note.id}
												disabled={pendingNoteId !== null}
												onclick={() => handleReveal(note.id)}
											>
												<Megaphone size={14} aria-hidden="true" />
												Reveal Test
											</Button>
										{/if}
									{/if}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			{#if assignmentsLoading}
				<p class="mt-6 text-sm text-gray-500">Loading…</p>
			{:else if assignmentsError}
				<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<p>{assignmentsError}</p>
					<button
						type="button"
						class="mt-1 font-medium underline underline-offset-2"
						onclick={() => loadAssignments(courseId)}
					>
						Retry
					</button>
				</div>
			{:else if assignments.length === 0}
				<div class="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
					<ClipboardList size={22} class="mx-auto text-gray-300" aria-hidden="true" />
					<p class="mt-2 font-medium text-gray-700">No assignments yet</p>
					<p class="mt-1 text-sm text-gray-500">Your administrator sets these up - none for this course yet.</p>
				</div>
			{:else}
				<div class="mt-6 flex flex-col gap-2">
					{#each assignments as assignment (assignment.id)}
						<a
							href={`/instructor/courses/${courseId}/assignments/${assignment.id}`}
							class="flex flex-wrap items-stretch justify-between gap-3 overflow-hidden rounded-xl border border-gray-200 bg-surface hover:bg-gray-50"
						>
							<div class={`w-1 shrink-0 ${assignmentTabColor(assignment)}`} aria-hidden="true"></div>
							<div class="min-w-0 flex-1 py-4">
								<div class="flex items-center gap-2">
									<p class="truncate font-medium text-gray-900">{assignment.title}</p>
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
								</div>
								<p class="mt-0.5 text-sm text-gray-500">Submitted {formatDate(assignment.createdAt)}</p>
							</div>

							<div class="flex shrink-0 items-center gap-2 py-4 pr-5">
								{#if assignment.generatedAt !== null}
									<Badge tone="brand">Generated</Badge>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{/if}
	</main>
</div>
