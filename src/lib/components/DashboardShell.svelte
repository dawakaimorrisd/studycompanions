
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.svelte';
	import type { Snippet } from 'svelte';

	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import Home from '@lucide/svelte/icons/house';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Users from '@lucide/svelte/icons/users';
	import UserCircle from '@lucide/svelte/icons/circle-user';
	import LogOut from '@lucide/svelte/icons/log-out';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Share2 from '@lucide/svelte/icons/share-2';

	let { children }: { children: Snippet } = $props();

	let mobileOpen = $state(false);

	const studentLinks = [
		{
			href: '/student',
			label: 'Dashboard',
			icon: Home,
			match: (path: string) => path === '/student'
		},
		{
			href: '/student/notes',
			label: 'My Notes',
			icon: BookOpen,
			match: (path: string) => path.startsWith('/student/notes')
		},
		{
			href: '/student/assignments',
			label: 'My Homework',
			icon: ClipboardList,
			match: (path: string) => path.startsWith('/student/assignments')
		},
		{
			href: '/student/shared',
			label: 'Shared with me',
			icon: Share2,
			match: (path: string) => path.startsWith('/student/shared')
		},
		{
			href: '/student/courses',
			label: 'My Courses',
			icon: GraduationCap,
			match: (path: string) => path.startsWith('/student/courses')
		},
		{
			href: '/student/account',
			label: 'Account',
			icon: UserCircle,
			match: (path: string) => path.startsWith('/student/account')
		}
	];

	const instructorLinks = [
		{
			href: '/instructor',
			label: 'Dashboard',
			icon: Home,
			match: (path: string) => path === '/instructor'
		},
		{
			href: '/instructor/courses',
			label: 'My Courses',
			icon: GraduationCap,
			match: (path: string) => path.startsWith('/instructor/courses')
		},
		{
			href: '/instructor/students',
			label: 'My Students',
			icon: Users,
			match: (path: string) => path.startsWith('/instructor/students')
		},
		{
			href: '/instructor/account',
			label: 'Account',
			icon: UserCircle,
			match: (path: string) => path.startsWith('/instructor/account')
		}
	];

	const links = $derived(
		session.role === 'student' ? studentLinks : instructorLinks
	);

	const path = $derived(page.url.pathname);

	const displayName = $derived(
		session.role === 'student'
			? session.current?.student?.name
			: session.current?.instructor?.name
	);

	function logout() {
		session.clear();
		goto('/login');
	}

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<div class="min-h-screen bg-gray-50 text-gray-900">
	<!-- Mobile top bar -->
	<header
		class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden"
	>
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
				aria-label="Open navigation"
				onclick={() => (mobileOpen = true)}
			>
				<Menu size={22} />
			</button>

			<div>
				<p class="text-base font-bold tracking-tight">
					Study Companion
				</p>

				<p class="text-xs text-gray-500">
					{session.role === 'student'
						? 'Student'
						: 'Instructor'}
				</p>
			</div>
		</div>

		<div
			class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold"
		>
			{displayName?.charAt(0)?.toUpperCase() ?? '?'}
		</div>
	</header>

	<!-- Mobile backdrop -->
	{#if mobileOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/30 lg:hidden"
			aria-label="Close navigation"
			onclick={closeMobile}
		></button>
	{/if}

	<!-- Sidebar -->
	<aside
		class={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
			mobileOpen
				? 'translate-x-0'
				: '-translate-x-full'
		}`}
	>
		<!-- Brand -->
		<div
			class="flex h-20 items-center justify-between border-b border-gray-100 px-6"
		>
			<div>
				<p class="text-lg font-bold tracking-tight">
					Study Companion
				</p>

				<p class="mt-0.5 text-xs text-gray-500">
					{session.role === 'student'
						? 'Student Portal'
						: 'Instructor Portal'}
				</p>
			</div>

			<button
				type="button"
				class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 lg:hidden"
				aria-label="Close navigation"
				onclick={closeMobile}
			>
				<X size={20} />
			</button>
		</div>

		<!-- User -->
		<div class="border-b border-gray-100 px-5 py-5">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white"
				>
					{displayName?.charAt(0)?.toUpperCase() ?? '?'}
				</div>

				<div class="min-w-0">
					<p
						class="truncate text-sm font-semibold text-gray-900"
					>
						{displayName ?? 'User'}
					</p>

					<p class="text-xs capitalize text-gray-500">
						{session.role}
					</p>
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto px-3 py-5">
			<p
				class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
			>
				Menu
			</p>

			<div class="space-y-1">
				{#each links as link (link.label)}
					<a
						href={link.href}
						class={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
							link.match(path)
								? 'bg-gray-900 text-white shadow-sm'
								: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
						}`}
						onclick={closeMobile}
					>
						<link.icon
							size={18}
							strokeWidth={1.8}
						/>

						<span>{link.label}</span>
					</a>
				{/each}
			</div>
		</nav>

		<!-- Logout -->
		<div class="border-t border-gray-100 p-3">
			<button
				type="button"
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600"
				onclick={logout}
			>
				<LogOut
					size={18}
					strokeWidth={1.8}
				/>

				<span>Sign out</span>
			</button>
		</div>
	</aside>

	<!-- Main -->
	<div class="lg:pl-64">
		<!-- Desktop header -->
		<header
			class="hidden h-20 items-center justify-between border-b border-gray-200 bg-white px-8 lg:flex"
		>
			<div>
				<p class="text-sm font-medium text-gray-500">
					{session.role === 'student'
						? 'Student Portal'
						: 'Instructor Portal'}
					{#if session.semester}
						· {session.semester.name}
					{/if}
				</p>

				<p class="text-lg font-semibold">
					Welcome back, {displayName ?? 'there'}.
				</p>
			</div>

			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white"
			>
				{displayName?.charAt(0)?.toUpperCase() ?? '?'}
			</div>
		</header>

		<main class="min-h-[calc(100vh-5rem)]">
			{@render children()}
		</main>
	</div>
</div>

