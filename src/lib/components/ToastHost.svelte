<script lang="ts">
	import { toasts } from '$lib/stores/toasts.svelte';

	const variantClasses: Record<string, string> = {
		error: 'bg-red-50 text-red-800 border-red-200',
		success: 'bg-instructor-50 text-instructor-800 border-instructor-200',
		info: 'bg-brand-50 text-brand-800 border-brand-200'
	};
</script>

<div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
	{#each toasts.items as toast (toast.id)}
		<div
			class={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-sm shadow-md ${variantClasses[toast.variant]}`}
			role="status"
		>
			<div class="flex items-start justify-between gap-3">
				<p class="leading-snug">{toast.message}</p>
				<button
					type="button"
					class="shrink-0 text-current/60 hover:text-current"
					aria-label="Dismiss"
					onclick={() => toasts.dismiss(toast.id)}
				>
					&times;
				</button>
			</div>
		</div>
	{/each}
</div>
