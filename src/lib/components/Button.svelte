<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost';
		/** Which brand color the primary/ghost variants use - lets the login page's button follow the selected role. */
		tone?: 'brand' | 'instructor';
		type?: 'button' | 'submit';
		loading?: boolean;
		disabled?: boolean;
		onclick?: () => void;
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		tone = 'brand',
		type = 'button',
		loading = false,
		disabled = false,
		onclick,
		class: className = '',
		children
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60';
	const variants: Record<string, Record<string, string>> = {
		primary: {
			brand: 'bg-brand-600 text-white hover:bg-brand-700',
			instructor: 'bg-instructor-600 text-white hover:bg-instructor-700'
		},
		secondary: {
			brand: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
			instructor: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
		},
		ghost: {
			brand: 'text-brand-600 hover:bg-brand-50',
			instructor: 'text-instructor-600 hover:bg-instructor-50'
		}
	};
</script>

<button
	{type}
	class={`${base} ${variants[variant][tone]} ${className}`}
	disabled={disabled || loading}
	{onclick}
>
	{#if loading}
		<span
			class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			aria-hidden="true"
		></span>
	{/if}
	{@render children?.()}
</button>
