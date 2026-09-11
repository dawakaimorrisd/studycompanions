
<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';

	import { getNote } from '$lib/api/content';
	import { ApiError } from '$lib/api/client';
	import { ActivityTracker } from '$lib/activity-tracking.svelte';
	import { downloads } from '$lib/offline/downloads.svelte';

	import type { NoteContent } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import ContentReader from '$lib/components/reader/ContentReader.svelte';
	import NoteTestPanel from '$lib/components/reader/NoteTestPanel.svelte';
	import DownloadButton from '$lib/components/DownloadButton.svelte';
	import StudyActivityIndicator from '$lib/components/StudyActivityIndicator.svelte';
	import Badge from '$lib/components/Badge.svelte';

	interface ReadingPage {
		id: string;
		content: string;
	}

	const noteId = $derived(page.params.id as string);

	let note = $state<NoteContent | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let usingOfflineCopy = $state(false);

	let tracker = $state<ActivityTracker | null>(null);

	const WORDS_PER_PAGE = 300;

	function paginateText(text: string): ReadingPage[] {
		if (!text.trim()) return [];

		const words = text.trim().split(/\s+/);
		const pages: ReadingPage[] = [];

		for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
			pages.push({
				id: `page-${pages.length + 1}`,
				content: words
					.slice(i, i + WORDS_PER_PAGE)
					.join(' ')
			});
		}

		return pages;
	}

	async function load(id: string) {
		loading = true;
		error = null;
		note = null;
		usingOfflineCopy = false;

		try {
			note = await getNote(id);
			return;
		} catch (err) {
			try {
				await Promise.race([
					downloads.ensureLoaded(),
					new Promise<never>((_, reject) => {
						setTimeout(
							() => reject(new Error('Offline store timeout')),
							3000
						);
					})
				]);

				const cached = downloads.get('note', id);

				if (cached) {
					note = cached.content as NoteContent;
					usingOfflineCopy = true;
					return;
				}
			} catch {
				// Offline cache unavailable.
			}

			error =
				err instanceof ApiError
					? err.message
					: 'Could not load this note.';
		} finally {
			loading = false;
		}
	}

	/*
	 * NOTE LOADING
	 */
	$effect(() => {
		const id = noteId;

		if (!id) {
			loading = false;
			error = 'Invalid note.';
			return;
		}

		void load(id);
	});

	/*
	 * ACTIVITY TRACKING
	 */
	$effect(() => {
		const id = noteId;

		if (!id) return;

		const previousTracker = untrack(() => tracker);

		previousTracker?.destroy();

		const nextTracker = new ActivityTracker(id);
		nextTracker.attach();

		tracker = nextTracker;
	});

	onDestroy(() => {
		untrack(() => {
			tracker?.destroy();
			tracker = null;
		});
	});

	function handleSubmitted() {
		void load(noteId);
	}

	function retry() {
		void load(noteId);
	}

	const readingPages = $derived(
		note ? paginateText(note.rawText) : []
	);
</script>

<svelte:head>
	<title>
		{note?.title
			? `${note.title} · Study Companion`
			: 'Note · Study Companion'}
	</title>
</svelte:head>

<AppHeader />

<main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
	{#if loading}
		<div class="flex min-h-[50vh] items-center justify-center">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"
				></div>

				<p class="text-sm text-gray-600">
					Loading note...
				</p>
			</div>
		</div>
	{:else if error}
		<div
			class="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6"
		>
			<h1 class="text-lg font-semibold text-red-900">
				Could not load this note
			</h1>

			<p class="mt-2 text-sm text-red-700">
				{error}
			</p>

			<button
				type="button"
				class="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
				onclick={retry}
			>
				Try again
			</button>
		</div>
	{:else if note}
		<div class="space-y-6">
			<header
				class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
			>
				<div
					class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
				>
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<Badge>{note.course.name}</Badge>

							{#if usingOfflineCopy}
								<Badge>Offline copy</Badge>
							{/if}
						</div>

						<h1
							class="mt-3 text-2xl font-bold tracking-tight text-gray-900"
						>
							{note.title}
						</h1>

						{#if note.chapterLabel}
							<p class="mt-1 text-sm text-gray-500">
								{note.chapterLabel}
							</p>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<StudyActivityIndicator tracker={tracker} />

						<DownloadButton
							contentType="note"
							contentId={note.id}
							content={note}
						/>
					</div>
				</div>

				{#if note.publishedAt}
					<p class="mt-4 text-xs text-gray-500">
						Published
						{new Date(note.publishedAt).toLocaleDateString()}
					</p>
				{/if}
			</header>

			{#if readingPages.length > 0}
				<section class="space-y-6">
					<ContentReader
						readTabLabel="Read"
						qaTabLabel="Test"
						questionUnits={note.questionUnits ?? []}
						generatedAt={note.generatedAt ?? null}
						readingPages={readingPages}
					>
						{#snippet readContent(readingPage)}
							<div
								class="whitespace-pre-wrap text-[17px] leading-8 text-gray-800"
							>
								{readingPage.content}
							</div>
						{/snippet}

						{#snippet qaContent()}
							{#if note.questionUnits?.length > 0}
								<NoteTestPanel
									note={note}
									onSubmitted={handleSubmitted}
								/>
							{:else}
								<div
									class="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center"
								>
									<p class="text-sm text-gray-500">
										No test questions are available for this note.
									</p>
								</div>
							{/if}
						{/snippet}
					</ContentReader>
				</section>
			{:else}
				<section
					class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
				>
					<p class="text-sm text-gray-600">
						This note does not have readable text yet.
					</p>
				</section>
			{/if}
		</div>
	{/if}
</main>

