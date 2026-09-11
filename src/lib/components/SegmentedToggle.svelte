<script lang="ts">
	interface Option {
		label: string;
		value: string;
	}

	interface Props {
		options: Option[];
		value: string;
	}

	let { options, value = $bindable() }: Props = $props();
</script>

<div
	class="grid gap-1 rounded-lg bg-gray-100 p-1"
	style={`grid-template-columns: repeat(${options.length}, minmax(0, 1fr));`}
>
	{#each options as opt (opt.value)}
		<button
			type="button"
			class={`rounded-md px-3 py-2 text-sm font-medium transition ${
				value === opt.value ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
			}`}
			onclick={() => (value = opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>
