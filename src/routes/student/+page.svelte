<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.svelte';
	import { getStudentHome } from '$lib/api/content';
	import { getStudentStudySummary } from '$lib/api/me';
	import { formatDuration } from '$lib/format';
	import type { StudentHomeContent, StudentStudySummary } from '$lib/types';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Flame from '@lucide/svelte/icons/flame';
	import Clock from '@lucide/svelte/icons/clock';

	let content = $state<StudentHomeContent | null>(null);
	let loading = $state(true);

	let summary = $state<StudentStudySummary | null>(null);
	let summaryLoading = $state(true);

	async function load() {
		loading = true;

		try {
			content = await getStudentHome();
		} catch {
			content = null;
		} finally {
			loading = false;
		}
	}

	async function loadSummary() {
		summaryLoading = true;
		try {
			summary = await getStudentStudySummary();
		} catch {
			summary = null;
		} finally {
			summaryLoading = false;
		}
	}

	// Do NOT use `$effect()` here - `load()`/`loadSummary()` don't write
	// back into anything this component reads reactively, but keeping this
	// as `onMount()` (not `$effect()`) matches the fix applied to every
	// other "load once" page in the app, for the same reason: an `$effect`
	// re-runs on ANY reactive value it reads changing, which is easy to
	// trigger by accident (e.g. a session store update elsewhere) and
	// causes a "keeps loading" symptom that's hard to trace back to this.
	onMount(() => {
		load();
		loadSummary();
	});

	const noteCount = $derived(content?.notes.length ?? 0);
	const assignmentCount = $derived(content?.assignments.length ?? 0);
</script>

<svelte:head>
	<title>Dashboard — Study Companion</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Welcome -->
	<section class="overflow-hidden rounded-2xl bg-gray-900 px-6 py-8 text-white shadow-sm sm:px-8">
		<div class="max-w-2xl">
			<div class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-200">
				<Sparkles size={14} />
				Your learning space
			</div>

			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
				Welcome back, {session.current?.student?.name?.split(' ')[0] ?? 'Student'}.
			</h1>

			<p class="mt-3 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
				Keep learning, review your materials, and stay on top of your assignments.
			</p>
		</div>
	</section>

	<!-- Quick stats -->
	<section class="mt-6 grid gap-4 sm:grid-cols-2">
		<a
			href="/student/notes"
			class="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<BookOpen size={21} class="text-gray-700" />
				</div>

				<ArrowRight
					size={18}
					class="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-600"
				/>
			</div>

			<p class="mt-5 text-2xl font-bold">{loading ? '—' : noteCount}</p>
			<p class="mt-1 text-sm font-medium text-gray-900">My Notes</p>
			<p class="mt-1 text-sm text-gray-500">Review your course materials</p>
		</a>

		<a
			href="/student/assignments"
			class="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<ClipboardList size={21} class="text-gray-700" />
				</div>

				<ArrowRight
					size={18}
					class="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-600"
				/>
			</div>

			<p class="mt-5 text-2xl font-bold">{loading ? '—' : assignmentCount}</p>
			<p class="mt-1 text-sm font-medium text-gray-900">My Homework</p>
			<p class="mt-1 text-sm text-gray-500">Homework you've submitted</p>
		</a>
	</section>

	<!-- Study summary (Phase 16) -->
	<section class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
		<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">This week</h2>
		{#if summaryLoading}
			<p class="mt-3 text-sm text-gray-500">Loading…</p>
		{:else if summary}
			<div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div>
					<p class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase">
						<Clock size={12} aria-hidden="true" />
						Studied
					</p>
					<p class="mt-1 text-xl font-bold text-gray-900">{formatDuration(summary.thisWeekSeconds)}</p>
				</div>
				<div>
					<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Courses</p>
					<p class="mt-1 text-xl font-bold text-gray-900">{summary.coursesStudiedThisWeek}</p>
				</div>
				<div>
					<p class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase">
						<Flame size={12} aria-hidden="true" />
						Streak
					</p>
					<p class="mt-1 text-xl font-bold text-gray-900">
						{summary.currentStreakDays} day{summary.currentStreakDays === 1 ? '' : 's'}
					</p>
				</div>
				<div>
					<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Most studied</p>
					<p class="mt-1 truncate text-sm font-medium text-gray-900">
						{summary.mostStudiedCourse?.courseName ?? '—'}
					</p>
				</div>
			</div>
		{:else}
			<p class="mt-3 text-sm text-gray-500">Couldn't load your study summary right now.</p>
		{/if}
	</section>

	<!-- Recent content -->
	<section class="mt-8">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">Continue learning</h2>
				<p class="mt-1 text-sm text-gray-500">Your most recent study materials</p>
			</div>

			<a
				href="/student/notes"
				class="hidden text-sm font-medium text-gray-700 hover:text-gray-950 sm:block"
			>
				View all
			</a>
		</div>

		{#if loading}
			<div class="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
				<p class="text-sm text-gray-500">Loading your learning materials…</p>
			</div>
		{:else if content && content.notes.length > 0}
			<div class="mt-4 space-y-3">
				{#each content.notes.slice(0, 4) as note (note.id)}
					<a
						href={`/student/notes/${note.id}`}
						class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
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
			<div class="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
				<BookOpen size={24} class="mx-auto text-gray-300" />
				<p class="mt-3 font-medium text-gray-700">Your learning space is ready</p>
				<p class="mt-1 text-sm text-gray-500">
					Your instructor hasn't added any notes yet.
				</p>
			</div>
		{/if}
	</section>
</div>