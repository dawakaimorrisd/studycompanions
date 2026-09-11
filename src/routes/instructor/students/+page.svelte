
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.svelte';
	import { getMyStudents } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import type { StudentSummary } from '$lib/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import InstructorNav from '$lib/components/InstructorNav.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Users from '@lucide/svelte/icons/users';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';

	let students = $state<StudentSummary[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let search = $state('');
	let engagementFilter = $state<'all' | 'engaged' | 'moderate' | 'at-risk'>('all');
	let sortBy = $state<'name' | 'study' | 'recent' | 'score'>('name');

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
					: 'Could not load your students.';
		} finally {
			loading = false;
		}
	}

	// onMount, not $effect - see the layout fixes for why: this page's
	// `load()` doesn't feed back into anything reactive it reads, but the
	// same "run exactly once, not on every reactive change" reasoning
	// applies everywhere in this app now for consistency.
	onMount(() => {
		load();
	});

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

	function formatLastStudied(value: string | null) {
		if (!value) return 'Never';

		const date = new Date(value);

		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
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

	function latestTest(student: StudentSummary) {
		if (student.chapterTests.length === 0) return null;

		return [...student.chapterTests].sort(
			(a, b) =>
				new Date(b.submittedAt).getTime() -
				new Date(a.submittedAt).getTime()
		)[0];
	}

	function testPercentage(student: StudentSummary) {
		const test = latestTest(student);

		if (!test || test.totalQuestions === 0) return null;

		return Math.round((test.score / test.totalQuestions) * 100);
	}

	function filteredStudents() {
		const query = search.trim().toLowerCase();

		const filtered = students.filter((student) => {
			const matchesSearch =
				query.length === 0 ||
				student.name.toLowerCase().includes(query) ||
				student.studentCode.toLowerCase().includes(query);

			const matchesEngagement =
				engagementFilter === 'all' ||
				student.engagement === engagementFilter;

			return matchesSearch && matchesEngagement;
		});

		return [...filtered].sort((a, b) => {
			if (sortBy === 'name') {
				return a.name.localeCompare(b.name);
			}

			if (sortBy === 'study') {
				return b.totalStudySeconds - a.totalStudySeconds;
			}

			if (sortBy === 'recent') {
				const aTime = a.lastStudiedAt
					? new Date(a.lastStudiedAt).getTime()
					: 0;

				const bTime = b.lastStudiedAt
					? new Date(b.lastStudiedAt).getTime()
					: 0;

				return bTime - aTime;
			}

			const aScore = testPercentage(a) ?? -1;
			const bScore = testPercentage(b) ?? -1;

			return bScore - aScore;
		});
	}

	const visibleStudents = $derived(filteredStudents());

	// SvelteKit client-side navigation, not a full browser reload -
	// `window.location.href` was re-running the entire app boot sequence
	// (instructor /me, theme, service worker, this page's own load) on
	// every click, which is what made opening a student feel slow.
	function openStudent(studentId: string) {
		goto(`/instructor/students/${studentId}`);
	}

	function handleRowKeydown(event: KeyboardEvent, studentId: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openStudent(studentId);
		}
	}
</script>

<svelte:head>
	<title>My Students — Study Companion</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader
		title="My Students"
		subtitle={session.current?.instructor?.name}
	/>

	<InstructorNav />

	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
		{#if loading}
			<div class="flex items-center gap-2 text-sm text-gray-500">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-instructor-500"
				></div>
				Loading students…
			</div>

		{:else if error}
			<div
				class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
			>
				<p>{error}</p>

				<button
					type="button"
					class="mt-1 font-medium underline underline-offset-2"
					onclick={load}
				>
					Retry
				</button>
			</div>

		{:else if students.length === 0}
			<div
				class="rounded-xl border border-dashed border-gray-300 p-10 text-center"
			>
				<Users
					size={24}
					class="mx-auto text-gray-300"
					aria-hidden="true"
				/>

				<p class="mt-3 font-medium text-gray-700">
					No students yet
				</p>

				<p class="mt-1 text-sm text-gray-500">
					Once students in your courses start studying, they'll show up here.
				</p>
			</div>

		{:else}
			<!-- PAGE HEADER -->
			<div class="mb-6">
				<div class="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 class="font-display text-2xl font-semibold text-gray-900">
							Student Performance
						</h1>

						<p class="mt-1 text-sm text-gray-500">
							Monitor student activity, engagement, and chapter-test performance.
						</p>
					</div>

					<div class="flex items-center gap-2 text-sm text-gray-500">
						<Users size={16} aria-hidden="true" />

						<span>
							{visibleStudents.length}
							{visibleStudents.length === 1 ? 'student' : 'students'}
						</span>
					</div>
				</div>
			</div>

			<!-- FILTERS -->
			<div class="mb-4 rounded-xl border border-gray-200 bg-surface p-4">
				<div class="flex flex-col gap-3 lg:flex-row">
					<!-- SEARCH -->
					<div class="relative min-w-0 flex-1">
						<Search
							size={17}
							class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							aria-hidden="true"
						/>

						<input
							type="search"
							bind:value={search}
							placeholder="Search by student name or ID…"
							class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-instructor-400 focus:ring-2 focus:ring-instructor-100"
						/>
					</div>

					<!-- ENGAGEMENT -->
					<div class="relative">
						<select
							bind:value={engagementFilter}
							class="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm text-gray-700 outline-none focus:border-instructor-400 focus:ring-2 focus:ring-instructor-100 lg:w-44"
						>
							<option value="all">All engagement</option>
							<option value="engaged">Engaged</option>
							<option value="moderate">Moderate</option>
							<option value="at-risk">At Risk</option>
						</select>
					</div>

					<!-- SORT -->
					<div class="relative">
						<ArrowUpDown
							size={15}
							class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							aria-hidden="true"
						/>

						<select
							bind:value={sortBy}
							class="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-700 outline-none focus:border-instructor-400 focus:ring-2 focus:ring-instructor-100 lg:w-48"
						>
							<option value="name">Name</option>
							<option value="study">Study time</option>
							<option value="recent">Last studied</option>
							<option value="score">Test score</option>
						</select>
					</div>
				</div>
			</div>

			<!-- STUDENT LIST -->
			{#if visibleStudents.length === 0}
				<div
					class="rounded-xl border border-dashed border-gray-300 bg-surface p-10 text-center"
				>
					<Search
						size={22}
						class="mx-auto text-gray-300"
						aria-hidden="true"
					/>

					<p class="mt-2 font-medium text-gray-700">
						No students found
					</p>

					<p class="mt-1 text-sm text-gray-500">
						Try changing your search or engagement filter.
					</p>
				</div>
			{:else}
				<div
					class="overflow-hidden rounded-xl border border-gray-200 bg-surface"
				>
					<!-- DESKTOP TABLE -->
					<div class="hidden overflow-x-auto md:block">
						<table class="min-w-full text-sm">
							<thead class="border-b border-gray-200 bg-gray-50">
								<tr>
									<th class="px-5 py-3 text-left font-medium text-gray-500">
										Student
									</th>

									<th class="px-4 py-3 text-left font-medium text-gray-500">
										Engagement
									</th>

									<th class="px-4 py-3 text-left font-medium text-gray-500">
										Study time
									</th>

									<th class="px-4 py-3 text-left font-medium text-gray-500">
										Last studied
									</th>

									<th class="px-4 py-3 text-left font-medium text-gray-500">
										Most studied
									</th>

									<th class="px-5 py-3 text-left font-medium text-gray-500">
										Latest test
									</th>

									<th class="w-10 px-3 py-3"></th>
								</tr>
							</thead>

							<tbody class="divide-y divide-gray-100">
								{#each visibleStudents as student (student.id)}
									{@const test = latestTest(student)}
									{@const testPercent = testPercentage(student)}

									<tr
										class="group cursor-pointer transition hover:bg-gray-50 focus-within:bg-gray-50"
										role="link"
										tabindex="0"
										onclick={() => openStudent(student.id)}
										onkeydown={(event) =>
											handleRowKeydown(event, student.id)}
									>
										<td class="px-5 py-4">
											<div class="min-w-0">
												<p class="font-medium text-gray-900">
													{student.name}
												</p>

												<p class="mt-0.5 text-xs text-gray-500">
													{student.studentCode}
												</p>
											</div>
										</td>

										<td class="px-4 py-4">
											<span
												class={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${engagementClasses(student.engagement)}`}
											>
												{engagementLabel(student.engagement)}
											</span>
										</td>

										<td class="whitespace-nowrap px-4 py-4 font-medium text-gray-900">
											{formatStudyTime(student.totalStudySeconds)}
										</td>

										<td class="whitespace-nowrap px-4 py-4 text-gray-600">
											{formatLastStudied(student.lastStudiedAt)}
										</td>

										<td class="max-w-40 px-4 py-4">
											{#if student.mostStudiedContent}
												<p class="truncate font-medium text-gray-700">
													{student.mostStudiedContent.title}
												</p>

												<p class="mt-0.5 text-xs text-gray-400">
													{formatStudyTime(student.mostStudiedContent.seconds)}
												</p>
											{:else}
												<span class="text-gray-400">—</span>
											{/if}
										</td>

										<td class="px-5 py-4">
											{#if test}
												<div class="whitespace-nowrap">
													<p class="font-medium text-gray-900">
														{test.score}/{test.totalQuestions}
													</p>

													{#if testPercent !== null}
														<p class="mt-0.5 text-xs text-gray-400">
															{testPercent}%
														</p>
													{/if}
												</div>
											{:else}
												<span class="text-gray-400">No tests</span>
											{/if}
										</td>

										<td class="px-3 py-4">
											<ChevronRight
												size={17}
												class="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500"
												aria-hidden="true"
											/>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- MOBILE LIST -->
					<div class="divide-y divide-gray-100 md:hidden">
						{#each visibleStudents as student (student.id)}
							{@const test = latestTest(student)}
							{@const testPercent = testPercentage(student)}

							<button
								type="button"
								class="block w-full px-4 py-4 text-left transition hover:bg-gray-50"
								onclick={() => openStudent(student.id)}
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate font-medium text-gray-900">
											{student.name}
										</p>

										<p class="mt-0.5 text-xs text-gray-500">
											{student.studentCode}
										</p>
									</div>

									<span
										class={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${engagementClasses(student.engagement)}`}
									>
										{engagementLabel(student.engagement)}
									</span>
								</div>

								<div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
									<div>
										<p class="text-xs text-gray-400">Study time</p>

										<p class="mt-0.5 font-medium text-gray-900">
											{formatStudyTime(student.totalStudySeconds)}
										</p>
									</div>

									<div>
										<p class="text-xs text-gray-400">Last studied</p>

										<p class="mt-0.5 font-medium text-gray-900">
											{formatLastStudied(student.lastStudiedAt)}
										</p>
									</div>

									<div>
										<p class="text-xs text-gray-400">Most studied</p>

										{#if student.mostStudiedContent}
											<p class="mt-0.5 truncate font-medium text-gray-900">
												{student.mostStudiedContent.title}
											</p>
										{:else}
											<p class="mt-0.5 text-gray-400">—</p>
										{/if}
									</div>

									<div>
										<p class="text-xs text-gray-400">Latest test</p>

										{#if test}
											<p class="mt-0.5 font-medium text-gray-900">
												{test.score}/{test.totalQuestions}

												{#if testPercent !== null}
													<span class="ml-1 text-xs text-gray-400">
														({testPercent}%)
													</span>
												{/if}
											</p>
										{:else}
											<p class="mt-0.5 text-gray-400">No tests</p>
										{/if}
									</div>
								</div>

								<div class="mt-3 flex items-center justify-end">
									<span class="flex items-center gap-1 text-xs font-medium text-gray-400">
										View student
										<ChevronRight size={14} aria-hidden="true" />
									</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</main>
</div>

