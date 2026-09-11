<script lang="ts">
	interface Props {
		label: string;
		type?: string;
		value: string;
		placeholder?: string;
		autocomplete?: string;
		id?: string;
		/** Field-level error, e.g. "Current password is incorrect" - shown under the input instead of a generic toast. */
		error?: string | null;
	}

	let {
		label,
		type = 'text',
		value = $bindable(),
		placeholder = '',
		autocomplete = 'off',
		id = label.toLowerCase().replace(/\s+/g, '-'),
		error = null
	}: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-sm font-medium text-gray-700">{label}</label>
	<input
		{id}
		{type}
		{placeholder}
		autocomplete={autocomplete as HTMLInputElement['autocomplete']}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		class={`rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 ${
			error
				? 'border-red-300 focus:border-red-500 focus:ring-red-100'
				: 'border-gray-300 focus:border-brand-500 focus:ring-brand-100'
		}`}
	/>
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>
