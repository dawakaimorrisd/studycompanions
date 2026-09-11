<script lang="ts">
	import Badge from './Badge.svelte';
	import DownloadButton from './DownloadButton.svelte';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';

	type BadgeTone = 'neutral' | 'brand' | 'warning' | 'success' | 'danger';

	interface Props {
		href: string;
		kind: 'note' | 'assignment';
		id: string;
		title: string;
		courseName: string;
		courseCode: string;
		/** e.g. "Chapter 3" - Notes only. */
		chapterLabel?: string | null;
		generated: boolean;
		/** Test/drill status badge, computed by the caller since Notes and Assignments read it differently. */
		statusBadge?: { label: string; tone: BadgeTone } | null;
	}

	let {
		href,
		kind,
		id,
		title,
		courseName,
		courseCode,
		chapterLabel = null,
		generated,
		statusBadge = null
	}: Props = $props();

	// Phase 10-17 handoff §9 (restated in the update): there's still no
	// backend signal at all for "has this student engaged with this item
	// before" - not `openedAt`, not a `publishedAt` on this endpoint either
	// (GET /students/me/content's documented shape doesn't carry one).
	// Don't invent a recency heuristic here - it would just be wrong some
	// of the time in a way nobody could tell from the UI. This component
	// currently has no "New" badge; add one back only once a real signal
	// exists (flagged to backend as a genuine gap, not yet in the API).


	// The "index tab" motif: a colored left edge carrying the same status
	// language used everywhere else in the app (course rows, results
	// dashboard) instead of relying on the badge text alone.
	const tabColor = $derived(
		!generated
			? 'bg-gray-300'
			: statusBadge?.tone === 'warning'
				? 'bg-amber-500'
				: statusBadge?.tone === 'success'
					? 'bg-instructor-500'
					: statusBadge?.tone === 'brand'
						? 'bg-brand-500'
						: 'bg-brand-200'
	);
</script>

<div
	class="flex items-stretch gap-4 overflow-hidden rounded-xl border border-gray-200 bg-surface transition hover:border-brand-300 hover:shadow-sm"
>
	<div class={`w-1 shrink-0 ${tabColor}`} aria-hidden="true"></div>
	<a {href} class="min-w-0 flex-1 py-4">
		<div class="flex items-center gap-2">
			{#if kind === 'note'}
				<BookOpen size={15} class="shrink-0 text-gray-400" aria-hidden="true" />
			{:else}
				<ClipboardList size={15} class="shrink-0 text-gray-400" aria-hidden="true" />
			{/if}
			<p class="truncate font-medium text-gray-900">{title}</p>
		</div>
		<p class="mt-0.5 truncate text-sm text-gray-500">
			{courseName} · {courseCode}{chapterLabel ? ' · ' + chapterLabel : ''}
		</p>
	</a>
	<div class="flex shrink-0 items-center gap-2 py-4 pr-5">
		{#if !generated}
			<Badge tone="warning">Not yet ready to study</Badge>
		{:else if statusBadge}
			<Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
		{/if}
		<DownloadButton {kind} {id} {title} {courseName} {courseCode} />
	</div>
</div>
