<script lang="ts">
	import { downloads } from '$lib/offline/downloads.svelte';
	import { toasts } from '$lib/stores/toasts.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		kind: 'note' | 'assignment';
		id: string;
		title: string;
		courseName: string;
		courseCode: string;
		/** Prevent the click from bubbling to a wrapping link (used inline in list rows). */
		stopPropagation?: boolean;
	}

	let { kind, id, title, courseName, courseCode, stopPropagation = false }: Props = $props();

	$effect(() => {
		downloads.ensureLoaded();
	});

	const isDownloaded = $derived(downloads.isDownloaded(kind, id));
	const isDownloading = $derived(downloads.isDownloading(kind, id));

	async function handleClick(e: MouseEvent) {
		if (stopPropagation) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (isDownloaded) {
			await downloads.remove(kind, id);
			return;
		}
		try {
			await downloads.download(kind, id, { title, courseName, courseCode });
		} catch {
			toasts.error('Could not download this for offline use. Check your connection and try again.');
		}
	}
</script>

<button
	type="button"
	class={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
		isDownloaded
			? 'border-instructor-200 bg-instructor-50 text-instructor-700 hover:bg-instructor-100'
			: 'border-gray-200 bg-surface text-gray-600 hover:bg-gray-50'
	}`}
	disabled={isDownloading}
	onclick={handleClick}
>
	{#if isDownloading}
		<span
			class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
			aria-hidden="true"
		></span>
		Downloading…
	{:else if isDownloaded}
		<Check size={14} aria-hidden="true" />
		Downloaded
	{:else}
		<Download size={14} aria-hidden="true" />
		Download
	{/if}
</button>
