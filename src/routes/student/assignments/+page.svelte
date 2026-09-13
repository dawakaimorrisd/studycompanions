<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { getStudentHome } from '$lib/api/content';
	import type { StudentHomeContent } from '$lib/types';

	import Button from '$lib/components/Button.svelte';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import User from '@lucide/svelte/icons/user';

	let content = $state<StudentHomeContent | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let initialLoadComplete = $state(false);

	async function load(showLoading = true) {
		if (showLoading) {
			loading = true;
		}

		error = null;

		try {
			content = await getStudentHome();
		} catch (err) {
			error = err instanceof Error
				? err.message
				: 'Could not load your assignments.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load().then(() => {
			initialLoadComplete = true;
		});
	});

	afterNavigate(() => {
		if (initialLoadComplete) {
			load(false);
		}
	});
</script>

<svelte:head>
	<title>My Homework — Study Companion</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-gray-900">
				My Homework
			</h1>
			<p class="mt-1 text-sm text-gray-500">
				Homework you've submitted, or been tagged in as a group member.
			</p>
		</div>

		<Button onclick={() => goto('/student/assignments/new')}>
			<Plus size={15} aria-hidden="true" />
			Submit Homework
		</Button>
	</div>

	{#if loading}
		<div class="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm text-gray-500">Loading your assignments…</p>
		</div>
	{:else if error}
		<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<p>{error}</p>
			<button
				type="button"
				class="mt-1 font-medium underline underline-offset-2"
				onclick={() => load()}
			>
				Retry
			</button>
		</div>
	{:else if content && content.assignments.length > 0}
		<div class="mt-6 grid gap-3">
			{#each content.assignments as assignment (assignment.id)}
				<div
					class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
				>
					<a href={`/student/assignments/${assignment.id}`} class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="truncate font-medium text-gray-900">
								{assignment.title}
							</p>

							{#if assignment.type}
								<span
									class="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
								>
									{#if assignment.type === 'GROUP'}
										<Users size={10} aria-hidden="true" />
										Group
									{:else}
										<User size={10} aria-hidden="true" />
										Individual
									{/if}
								</span>
							{/if}
						</div>

						<p class="mt-1 text-sm text-gray-500">
							{assignment.course?.courseCode ?? ''}
						</p>
					</a>

					<a
						href={`/student/assignments/${assignment.id}`}
						aria-label={`Open ${assignment.title}`}
					>
						<ArrowRight
							size={18}
							class="ml-4 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700"
						/>
					</a>
				</div>
			{/each}
		</div>
	{:else}
		<div class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
			<ClipboardList size={24} class="mx-auto text-gray-300" />
			<p class="mt-3 font-medium text-gray-700">Nothing submitted yet</p>
			<p class="mt-1 text-sm text-gray-500">
				When you submit homework, it'll show up here.
			</p>
		</div>
	{/if}
</div>