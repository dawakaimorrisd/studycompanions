<script lang="ts">
	interface Props {
		label: string;
		file: File | null;
		accept?: string;
		id?: string;
	}

	let {
		label,
		file = $bindable(),
		accept = '.pdf,.docx',
		id = label.toLowerCase().replace(/\s+/g, '-')
	}: Props = $props();

	function handleChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		file = input.files?.[0] ?? null;
	}
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-sm font-medium text-gray-700">{label}</label>
	<input
		{id}
		type="file"
		{accept}
		onchange={handleChange}
		class="text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
	/>
	{#if file}
		<p class="text-xs text-gray-500">{file.name}</p>
	{/if}
</div>
