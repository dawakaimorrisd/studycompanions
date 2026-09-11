
<script lang="ts">
	import { PUBLIC_API_BASE_URL } from '$env/static/public';
	import FileText from '@lucide/svelte/icons/file-text';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	interface Props {
		pdfUrl?: string | null;
		fileName?: string;
		/** Shown when pdfUrl is missing. */
		unavailableMessage?: string;
	}

	let {
		pdfUrl = null,
		fileName = 'document.pdf',
		unavailableMessage = "This file's preview isn't available yet."
	}: Props = $props();

	/**
	 * Resolve backend-relative upload URLs.
	 *
	 * Development:
	 *   /uploads/studycompanion/file.pdf
	 *   ->
	 *   https://backend...-5173.app.github.dev/uploads/studycompanion/file.pdf
	 *
	 * Production URLs such as Cloudinary URLs are returned unchanged.
	 */
	function resolveBackendUrl(url: string): string {
		if (/^https?:\/\//i.test(url)) {
			return url;
		}

		const base = PUBLIC_API_BASE_URL.replace(/\/$/, '');
		const path = url.replace(/^\//, '');

		return `${base}/${path}`;
	}
</script>

{#if pdfUrl}
	{@const resolvedPdfUrl = resolveBackendUrl(pdfUrl)}

	<div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
		<div
			class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5"
		>
			<p class="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-gray-700">
				<FileText size={15} class="shrink-0 text-gray-400" aria-hidden="true" />
				<span class="truncate">{fileName}</span>
			</p>

			<a
				href={resolvedPdfUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
			>
				<ExternalLink size={14} aria-hidden="true" />
				Open
			</a>
		</div>

		<iframe
			src={resolvedPdfUrl}
			title={fileName}
			class="h-[75vh] w-full border-0 bg-white"
		></iframe>
	</div>
{:else}
	<div class="rounded-xl border border-dashed border-gray-300 p-8 text-center">
		<FileText size={22} class="mx-auto text-gray-300" aria-hidden="true" />
		<p class="mt-2 text-sm text-gray-500">{unavailableMessage}</p>
	</div>
{/if}

