<script lang="ts">
	// Instructor self-serve flow: Upload -> Generate -> Publish.
	// Per explicit product decision, Instructor does NOT see the generated
	// questions or dictionary/glossary content at all - not even for
	// review before publishing. This is a frontend display decision only:
	// the backend's GET /notes/:id still returns the full questionUnits to
	// a staff caller with canManageCourse (that's documented, unchanged,
	// and there's no way to ask the backend to withhold it specifically
	// from this screen) - this page just never renders that part of the
	// response. See the backend handoff doc if a real server-side block is
	// wanted instead of a client-side one.
	import { page } from '$app/state';
	import { getNote } from '$lib/api/content';
	import { generateNote, publishNote } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import type { NoteContent } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	const courseId = $derived(page.params.courseId as string);
	const noteId = $derived(page.params.noteId as string);
	const course = $derived(instructorCourses.find(courseId));

	let note = $state<NoteContent | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	let generating = $state(false);
	let publishing = $state(false);
	let actionError = $state<string | null>(null);

	async function load() {
		loading = true;
		loadError = null;
		try {
			// One call now - GET /notes/:id includes createdAt/publishedAt
			// directly as of the v3 handoff, no more second call to the
			// course content list just for those two fields. Note: the
			// response also includes questionUnits, which this page
			// deliberately never reads or renders (see the top-of-file
			// comment).
			note = await getNote(noteId);
		} catch (err) {
			loadError = err instanceof ApiError ? err.message : 'Could not load this note.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		instructorCourses.ensureLoaded();
		load();
	});

	async function handleGenerate() {
		generating = true;
		actionError = null;
		try {
			await generateNote(noteId);
			await load();
			toasts.success('Study materials generated.');
		} catch (err) {
			// A generation failure's message is the actual reason it failed,
			// not a generic one - surface it directly (frontendgurad.md §4).
			actionError = err instanceof ApiError ? err.message : 'Could not generate study materials.';
		} finally {
			generating = false;
		}
	}

	async function handlePublish() {
		publishing = true;
		actionError = null;
		try {
			await publishNote(noteId);
			await load();
			toasts.success('Saved for students.');
		} catch (err) {
			actionError = err instanceof ApiError ? err.message : 'Could not publish this note.';
		} finally {
			publishing = false;
		}
	}
</script>

<svelte:head>
	<title>{note?.title ?? 'Note'} — Study Companion</title>
</svelte:head>

<AppHeader
	title={note?.title ?? 'Note'}
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
	{:else if note}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				{#if note.chapterLabel}
					<Badge tone="neutral">{note.chapterLabel}</Badge>
				{/if}
				{#if note.publishedAt}
					<Badge tone="success">Published</Badge>
				{:else if note.generatedAt}
					<Badge tone="warning">Ready to publish</Badge>
				{:else}
					<Badge tone="neutral">Not generated yet</Badge>
				{/if}
			</div>
		</div>

		{#if actionError}
			<div class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{actionError}
			</div>
		{/if}

		{#if note.generatedAt === null}
			<!-- Step 1: not generated yet - show the source and offer Generate. -->
			<div class="mt-6 rounded-xl border border-gray-200 bg-surface p-5">
				<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">Source text</h2>
				<p class="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
					{note.rawText}
				</p>
			</div>

			<div class="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 p-8 text-center">
				<Sparkles size={22} class="text-gray-300" aria-hidden="true" />
				<p class="text-sm text-gray-600">
					Generate the study materials (questions, explanations, and glossary) from this text
					before students can see any of it.
				</p>
				<Button tone="instructor" loading={generating} onclick={handleGenerate}>
					<Sparkles size={15} aria-hidden="true" />
					Generate Study Materials
				</Button>
			</div>
		{:else if !note.publishedAt}
			<!-- Step 2: generated, not published yet. No content preview by
			     design - Instructor doesn't review the Q&A/dictionary, they
			     just decide when to make it available. -->
			<div class="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 p-8 text-center">
				<CheckCircle2 size={22} class="text-instructor-500" aria-hidden="true" />
				<p class="text-sm text-gray-600">
					Study materials have been generated from this note. Once you save it for students,
					every paid and enrolled student in this course sees it automatically - there's no
					recipient list to pick.
				</p>
				<Button tone="instructor" loading={publishing} onclick={handlePublish}>
					<Megaphone size={15} aria-hidden="true" />
					Save for Students
				</Button>
			</div>
		{:else}
			<!-- Step 3: published. Nothing further to do here. -->
			<div class="mt-6 flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-surface p-8 text-center">
				<CheckCircle2 size={22} class="text-instructor-500" aria-hidden="true" />
				<p class="text-sm text-gray-600">This note has been published to students.</p>
			</div>
		{/if}
	{/if}
</main>
