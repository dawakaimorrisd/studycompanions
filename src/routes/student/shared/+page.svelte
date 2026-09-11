<script lang="ts">
	// Real, server-gated drill set as of v3 - correctOption/explanation are
	// null until the recipient finishes a drill attempt on that specific
	// distribution (see DistributionDrillPanel). Question/option text and
	// dictionary entries are always visible immediately, same as an
	// Assignment's own drill.
	import { getReceivedDistributions } from '$lib/api/submissions';
	import { ApiError } from '$lib/api/client';
	import type { ReceivedDistribution } from '$lib/types';

	import DistributionDrillPanel from '$lib/components/reader/DistributionDrillPanel.svelte';
	import PdfViewer from '$lib/components/PdfViewer.svelte';
	import Share2 from '@lucide/svelte/icons/share-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let distributions = $state<ReceivedDistribution[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expandedId = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await getReceivedDistributions();
			distributions = res.distributions;
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Could not load what classmates have shared with you.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
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
	<title>Shared with me — Study Companion</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-gray-900">Shared with me</h1>
			<p class="mt-1 text-sm text-gray-500">
				Study material classmates generated from their own assignment submissions and sent to you.
			</p>
		</div>
		<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
			<Share2 size={21} class="text-gray-700" />
		</div>
	</div>

	{#if loading}
		<p class="mt-6 text-sm text-gray-500">Loading…</p>
	{:else if error}
		<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<p>{error}</p>
			<button type="button" class="mt-1 font-medium underline underline-offset-2" onclick={load}>
				Retry
			</button>
		</div>
	{:else if distributions.length === 0}
		<div class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
			<Share2 size={24} class="mx-auto text-gray-300" />
			<p class="mt-3 font-medium text-gray-700">Nothing shared with you yet</p>
			<p class="mt-1 text-sm text-gray-500">
				When a classmate sends you study material from their own submission, it'll show up here.
			</p>
		</div>
	{:else}
		<div class="mt-6 flex flex-col gap-3">
			{#each distributions as dist (dist.distributionId)}
				{@const isOpen = expandedId === dist.distributionId}
				<div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
					<button
						type="button"
						class="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50"
						onclick={() => (expandedId = isOpen ? null : dist.distributionId)}
					>
						<div class="min-w-0">
							<p class="truncate font-medium text-gray-900">{dist.submission.assignment.title}</p>
							<p class="mt-0.5 truncate text-sm text-gray-500">
								{dist.submission.assignment.course.name} · {dist.submission.assignment.course.courseCode}
							</p>
							<p class="mt-0.5 text-sm text-gray-500">
								From {dist.sentBy.name}{dist.submission.groupName ? ` (${dist.submission.groupName})` : ''}
								· {formatDateTime(dist.receivedAt)}
							</p>
						</div>
						<ChevronDown
							size={18}
							class={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
							aria-hidden="true"
						/>
					</button>

					{#if isOpen}
						<div class="border-t border-gray-100 px-5 py-5">
							<PdfViewer
								pdfUrl={dist.submission.pdfUrl}
								fileName={dist.submission.fileName}
								unavailableMessage={dist.submission.pdfConversionError ?? "This file's preview isn't available yet."}
							/>
							<div class="mt-5">
								<DistributionDrillPanel distribution={dist} />
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
