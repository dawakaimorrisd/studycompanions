
<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import type { QuestionUnit } from '$lib/types';
	import DictionaryTab from './DictionaryTab.svelte';

	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Library from '@lucide/svelte/icons/library';

	type Tab = 'read' | 'qa' | 'dictionary';

	export interface ReadingPage {
		id: string;
		content: string;
	}

	interface Props {
		/** Label for the first tab: "Read" for Notes, "Sections" for Assignments. */
		readTabLabel?: string;

		/** Label for the second tab: "Test" for Notes, "Drill" for Assignments. */
		qaTabLabel?: string;

		questionUnits?: QuestionUnit[];

		generatedAt?: string | null;

		/**
		 * Word-count paginated reading pages.
		 */
		readingPages: ReadingPage[];

		/**
		 * Content for the current reading page.
		 */
		readContent?: Snippet<[ReadingPage]>;

		/**
		 * Test / drill content.
		 */
		qaContent?: Snippet;

		/**
		 * When true, the Read and Dictionary tabs are hidden.
		 */
		studyContentLocked?: boolean;

		/** Fired whenever the active tab changes. */
		onTabChange?: (tab: Tab) => void;
	}

	let {
		readTabLabel = 'Read',
		qaTabLabel = 'Test',
		questionUnits = [],
		generatedAt = null,
		readingPages,
		readContent,
		qaContent,
		studyContentLocked = false,
		onTabChange
	}: Props = $props();

	let activeTab = $state<Tab>('read');

	let currentPage = $state(0);

	/*
	 * If the content changes, return to the first valid page.
	 */
	$effect(() => {
		readingPages;

		if (currentPage >= readingPages.length) {
			currentPage = Math.max(0, readingPages.length - 1);
		}
	});

	/*
	 * When study content becomes locked, automatically
	 * move the student to the Test/Drill tab.
	 */
	$effect(() => {
		if (studyContentLocked && activeTab !== 'qa') {
			activeTab = 'qa';
			onTabChange?.('qa');
		}
	});

	function selectTab(tab: Tab) {
		if (studyContentLocked && tab !== 'qa') {
			return;
		}

		activeTab = tab;
		onTabChange?.(tab);
	}

	function previousPage() {
		if (currentPage > 0) {
			currentPage -= 1;
		}
	}

	function nextPage() {
		if (currentPage < readingPages.length - 1) {
			currentPage += 1;
		}
	}

	const tabs = $derived.by(
		(): { id: Tab; label: string; icon: Component }[] => {
			if (studyContentLocked) {
				return [
					{
						id: 'qa',
						label: qaTabLabel,
						icon: ClipboardCheck
					}
				];
			}

			return [
				{
					id: 'read',
					label: readTabLabel,
					icon: BookOpen
				},
				{
					id: 'qa',
					label: qaTabLabel,
					icon: ClipboardCheck
				},
				{
					id: 'dictionary',
					label: 'Dictionary',
					icon: Library
				}
			];
		}
	);

	const totalPages = $derived(readingPages.length);

	const displayedPage = $derived(
		readingPages[currentPage] ?? null
	);
</script>

<div>
	<!-- Tabs -->
	<div class="flex gap-1 border-b border-gray-200">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
					activeTab === tab.id
						? 'border-brand-600 text-brand-700'
						: 'border-transparent text-gray-500 hover:text-gray-700'
				}`}
				onclick={() => selectTab(tab.id)}
			>
				<tab.icon size={15} aria-hidden="true" />
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'read'}
		<!-- Reading area -->
		<div class="py-5">
			{#if displayedPage}
				<div
					class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
				>
					<!-- Page header -->
					<div
						class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3"
					>
						<div>
							<p
								class="text-xs font-semibold uppercase tracking-wider text-gray-400"
							>
								Reading
							</p>

							<p class="mt-0.5 text-sm font-medium text-gray-700">
								Page {currentPage + 1} of {totalPages}
							</p>
						</div>

						<div
							class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500"
						>
							{currentPage + 1} / {totalPages}
						</div>
					</div>

					<!-- Actual page -->
					<div class="min-h-[520px] px-6 py-8 sm:px-10 sm:py-10">
						<div class="mx-auto max-w-2xl">
							{#if readContent}
								{@render readContent(displayedPage)}
							{:else}
								<div
									class="whitespace-pre-wrap text-[17px] leading-8 text-gray-800"
								>
									{displayedPage.content}
								</div>
							{/if}
						</div>
					</div>

					<!-- Pagination controls -->
					<div
						class="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-4"
					>
						<button
							type="button"
							class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
							onclick={previousPage}
							disabled={currentPage === 0}
						>
							← Previous
						</button>

						<div class="hidden text-center sm:block">
							<p class="text-xs text-gray-400">
								Keep going one page at a time
							</p>
						</div>

						<button
							type="button"
							class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
							onclick={nextPage}
							disabled={currentPage >= totalPages - 1}
						>
							Next →
						</button>
					</div>
				</div>
			{:else}
				<div
					class="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500"
				>
					No reading content is available.
				</div>
			{/if}
		</div>

	{:else if activeTab === 'qa'}
		<div class="py-5">
			{#if qaContent}
				{@render qaContent()}
			{:else}
				<div
					class="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center"
				>
					<p class="text-sm text-gray-500">
						No test or drill content is available.
					</p>
				</div>
			{/if}
		</div>

	{:else}
		<div class="py-5">
			<DictionaryTab
				{questionUnits}
				{generatedAt}
			/>
		</div>
	{/if}
</div>

