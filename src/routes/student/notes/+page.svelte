<script lang="ts">
	import { getStudentHome } from '$lib/api/content';
	import type { StudentHomeContent } from '$lib/types';

	import BookOpen from '@lucide/svelte/icons/book-open';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let content = $state<StudentHomeContent | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;

		try {
			content = await getStudentHome();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load your notes.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});
</script>

<svelte:head>
	<title>My Notes — Study Companion</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-gray-900">My Notes</h1>
			<p class="mt-1 text-sm text-gray-500">
				Review your course notes and learning materials.
			</p>
		</div>

		<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
			<BookOpen size={21} class="text-gray-700" />
		</div>
	</div>

	{#if loading}
		<div class="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm text-gray-500">Loading your notes…</p>
		</div>
	{:else if error}
		<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<p>{error}</p>
			<button
				type="button"
				class="mt-1 font-medium underline underline-offset-2"
				onclick={load}
			>
				Retry
			</button>
		</div>
	{:else if content && content.notes.length > 0}
		<div class="mt-6 grid gap-3">
			{#each content.notes as note (note.id)}
				<a
					href={`/student/notes/${note.id}`}
					class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
				>
					<div class="min-w-0">
						<p class="truncate font-medium text-gray-900">{note.title}</p>

						<p class="mt-1 text-sm text-gray-500">
							{note.course?.courseCode ?? ''}
							{#if note.chapterLabel}
								<span class="mx-1">•</span>
								{note.chapterLabel}
							{/if}
						</p>
					</div>

					<ArrowRight
						size={18}
						class="ml-4 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700"
					/>
				</a>
			{/each}
		</div>
	{:else}
		<div class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
			<BookOpen size={24} class="mx-auto text-gray-300" />
			<p class="mt-3 font-medium text-gray-700">No notes yet</p>
			<p class="mt-1 text-sm text-gray-500">
				Your instructor hasn't added any notes yet.
			</p>
		</div>
	{/if}
</div>