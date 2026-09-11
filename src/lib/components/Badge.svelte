<script lang="ts">
	interface Props {
		tone?: 'neutral' | 'brand' | 'warning' | 'success' | 'danger';
		class?: string;
		children: import('svelte').Snippet;
	}

	let { tone = 'neutral', class: className = '', children }: Props = $props();

	const tones: Record<string, string> = {
		neutral: 'bg-gray-100 text-gray-600',
		brand: 'bg-brand-100 text-brand-700',
		warning: 'bg-amber-100 text-amber-700',
		success: 'bg-instructor-100 text-instructor-700',
		danger: 'bg-red-100 text-red-700'
	};
</script>

<span class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
	{@render children()}
</span>
