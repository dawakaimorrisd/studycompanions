<script lang="ts">
	interface Props {
		label: string;
		value: string;
		placeholder?: string;
		rows?: number;
		id?: string;
	}

	let {
		label,
		value = $bindable(),
		placeholder = '',
		rows = 8,
		id = label.toLowerCase().replace(/\s+/g, '-')
	}: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-sm font-medium text-gray-700">{label}</label>
	<textarea
		{id}
		{placeholder}
		{rows}
		bind:value
		class="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
	></textarea>
</div>
