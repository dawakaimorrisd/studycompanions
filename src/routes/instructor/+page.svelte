<script lang="ts">
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Users from '@lucide/svelte/icons/users';
	import Upload from '@lucide/svelte/icons/upload';
	import BarChart3 from '@lucide/svelte/icons/chart-no-axes-column';

	$effect(() => {
		instructorCourses.ensureLoaded();
	});
</script>

<svelte:head>
	<title>Dashboard — Study Companion</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Welcome -->
	<section class="overflow-hidden rounded-2xl bg-gray-900 px-6 py-8 text-white shadow-sm sm:px-8">
		<div class="max-w-2xl">
			<div class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-200">
				<GraduationCap size={14} />
				Instructor workspace
			</div>

			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
				Welcome back.
			</h1>

			<p class="mt-3 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
				Manage your courses, support your students, and keep your learning content organized.
			</p>
		</div>
	</section>

	<!-- Stats -->
	<section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<a
			href="/instructor/courses"
			class="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<GraduationCap size={21} />
				</div>
				<ArrowRight size={18} class="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-600" />
			</div>

			<p class="mt-5 text-2xl font-bold">
				{instructorCourses.loading && !instructorCourses.loaded ? '—' : instructorCourses.courses.length}
			</p>
			<p class="mt-1 text-sm font-medium">Courses</p>
			<p class="mt-1 text-sm text-gray-500">Manage your courses</p>
		</a>

		<a
			href="/instructor/students"
			class="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<Users size={21} />
				</div>
				<ArrowRight size={18} class="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-600" />
			</div>

			<p class="mt-5 text-2xl font-bold">—</p>
			<p class="mt-1 text-sm font-medium">Students</p>
			<p class="mt-1 text-sm text-gray-500">View your students</p>
		</a>

		<a
			href="/instructor/courses"
			class="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
		>
			<div class="flex items-start justify-between">
				<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
					<Upload size={21} />
				</div>
				<ArrowRight size={18} class="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-600" />
			</div>

			<p class="mt-5 text-2xl font-bold">→</p>
			<p class="mt-1 text-sm font-medium">Upload Content</p>
			<p class="mt-1 text-sm text-gray-500">Add material to a course</p>
		</a>
	</section>

	<!-- Courses -->
	<section class="mt-8">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">Your courses</h2>
				<p class="mt-1 text-sm text-gray-500">Quick access to your teaching areas</p>
			</div>

			<a
				href="/instructor/courses"
				class="hidden text-sm font-medium text-gray-700 hover:text-gray-950 sm:block"
			>
				View all
			</a>
		</div>

		{#if instructorCourses.loading && !instructorCourses.loaded}
			<div class="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
				<p class="text-sm text-gray-500">Loading your courses…</p>
			</div>
		{:else if instructorCourses.courses.length > 0}
			<div class="mt-4 grid gap-3 md:grid-cols-2">
				{#each instructorCourses.courses.slice(0, 6) as course (course.id)}
					<a
						href={`/instructor/courses/${course.id}`}
						class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
					>
						<div class="min-w-0">
							<p class="truncate font-medium text-gray-900">{course.name}</p>
							<p class="mt-1 text-sm text-gray-500">{course.courseCode}</p>
						</div>

						<ArrowRight
							size={18}
							class="ml-4 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700"
						/>
					</a>
				{/each}
			</div>
		{:else}
			<div class="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
				<GraduationCap size={24} class="mx-auto text-gray-300" />
				<p class="mt-3 font-medium text-gray-700">No courses yet</p>
				<p class="mt-1 text-sm text-gray-500">
					You haven't been assigned a course yet.
				</p>
			</div>
		{/if}
	</section>
</div>