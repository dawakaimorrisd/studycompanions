<script lang="ts">
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';

	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	$effect(() => {
		instructorCourses.ensureLoaded();
	});
</script>

<svelte:head>
	<title>My Courses — Study Companion</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-gray-900">
				My Courses
			</h1>
			<p class="mt-1 text-sm text-gray-500">
				Manage your courses and learning content.
			</p>
		</div>

		<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
			<GraduationCap size={21} class="text-gray-700" />
		</div>
	</div>

	{#if instructorCourses.loading && !instructorCourses.loaded}
		<div class="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm text-gray-500">Loading your courses…</p>
		</div>
	{:else if instructorCourses.error}
		<div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<p>{instructorCourses.error}</p>

			<button
				type="button"
				class="mt-1 font-medium underline underline-offset-2"
				onclick={() => instructorCourses.reload()}
			>
				Retry
			</button>
		</div>
	{:else if instructorCourses.courses.length > 0}
		<div class="mt-6 grid gap-4 md:grid-cols-2">
			{#each instructorCourses.courses as course (course.id)}
				<a
					href={`/instructor/courses/${course.id}`}
					class="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
				>
					<div class="flex items-start justify-between">
						<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
							<GraduationCap size={21} class="text-gray-700" />
						</div>

						<ArrowRight
							size={18}
							class="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700"
						/>
					</div>

					<div class="mt-5">
						<p class="font-semibold text-gray-900">
							{course.name}
						</p>

						<p class="mt-1 text-sm font-medium text-gray-500">
							{course.courseCode}
						</p>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
			<GraduationCap size={24} class="mx-auto text-gray-300" />
			<p class="mt-3 font-medium text-gray-700">No courses yet</p>
			<p class="mt-1 text-sm text-gray-500">
				You haven't been assigned any courses yet.
			</p>
		</div>
	{/if}
</div>