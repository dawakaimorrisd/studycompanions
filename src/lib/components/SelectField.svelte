<script lang="ts">
	interface Option {
		label: string;
		value: string;
	}

	interface Props {
		label: string;
		value: string;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		id?: string;
	}

	let {
		label,
		value = $bindable(),
		options,
		placeholder = 'Select…',
		disabled = false,
		id = label.toLowerCase().replace(/\s+/g, '-')
	}: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-sm font-medium text-gray-700">{label}</label>
	<select
		{id}
		bind:value
		{disabled}
		class="rounded-lg border border-gray-300 bg-surface px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-400"
	>
		<option value="" disabled selected={value === ''}>{placeholder}</option>
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</div>
