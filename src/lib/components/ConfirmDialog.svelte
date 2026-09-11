<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		cancelLabel: string;
		confirmTone?: 'brand' | 'instructor' | 'danger';
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmLabel,
		cancelLabel,
		confirmTone = 'brand',
		onconfirm,
		oncancel
	}: Props = $props();

	const confirmClasses: Record<string, string> = {
		brand: 'bg-brand-600 hover:bg-brand-700',
		instructor: 'bg-instructor-600 hover:bg-instructor-700',
		danger: 'bg-red-600 hover:bg-red-700'
	};
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-dialog-title"
			class="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl"
		>
			<h2 id="confirm-dialog-title" class="font-display text-base font-semibold text-gray-900">
				{title}
			</h2>
			<p class="mt-2 text-sm text-gray-600">{message}</p>

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					onclick={oncancel}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					class={`rounded-lg px-4 py-2 text-sm font-medium text-white ${confirmClasses[confirmTone]}`}
					onclick={onconfirm}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
