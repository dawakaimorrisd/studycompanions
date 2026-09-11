<script lang="ts">
	import { page } from '$app/state';
	import type { Component } from 'svelte';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Users from '@lucide/svelte/icons/users';
	import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';

	// Account is reachable from every page via AppHeader's account link, not
	// duplicated here as a third tab - these two are the actual content areas.
	const links: { href: string; label: string; icon: Component; match: (p: string) => boolean }[] = [
		{
			href: '/instructor',
			label: 'My Courses',
			icon: GraduationCap,
			match: (p: string) => p === '/instructor' || p.startsWith('/instructor/courses')
		},
		{
			href: '/instructor/students',
			label: 'My Students',
			icon: Users,
			match: (p: string) => p.startsWith('/instructor/students')
		},
		{
			href: '/instructor/analytics',
			label: 'Analytics',
			icon: ChartNoAxesColumn,
			match: (p: string) => p.startsWith('/instructor/analytics')
		}
	];

	const path = $derived(page.url.pathname);
</script>

<nav class="border-b border-gray-200 bg-surface px-4 sm:px-6">
	<div class="mx-auto flex max-w-3xl gap-1 overflow-x-auto">
		{#each links as link (link.href)}
			<a
				href={link.href}
				class={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
					link.match(path)
						? 'border-instructor-600 text-instructor-700'
						: 'border-transparent text-gray-500 hover:text-gray-700'
				}`}
			>
				<link.icon size={15} aria-hidden="true" />
				{link.label}
			</a>
		{/each}
	</div>
</nav>
