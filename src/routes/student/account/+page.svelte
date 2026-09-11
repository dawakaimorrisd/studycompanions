<script lang="ts">
	import { session } from '$lib/stores/session.svelte';
	import { changeStudentPassword } from '$lib/api/auth';
	import { getStudentHome } from '$lib/api/content';
	import { ApiError } from '$lib/api/client';
	import { toasts } from '$lib/stores/toasts.svelte';
	import type { CourseSubtitle } from '$lib/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import ChangePasswordForm from '$lib/components/ChangePasswordForm.svelte';

	const student = $derived(session.current?.student ?? null);

	// No dedicated "my courses" endpoint exists (build guide §5) - it's
	// fully derivable from the same home-content payload the Student home
	// screen already fetches, grouped by course.id.
	let courses = $state<CourseSubtitle[]>([]);
	let loadingCourses = $state(true);
	let coursesError = $state<string | null>(null);

	async function loadCourses() {
		loadingCourses = true;
		coursesError = null;
		try {
			const content = await getStudentHome();
			const byId = new Map<string, CourseSubtitle>();
			for (const item of [...content.notes, ...content.assignments]) {
				if (item.course?.courseCode && !byId.has(item.course.courseCode)) {
					byId.set(item.course.courseCode, item.course);
				}
			}
			courses = [...byId.values()];
		} catch (err) {
			coursesError = err instanceof ApiError ? err.message : 'Could not load your courses.';
		} finally {
			loadingCourses = false;
		}
	}

	$effect(() => {
		loadCourses();
	});

	async function handleChangePassword(currentPassword: string, newPassword: string) {
		await changeStudentPassword(currentPassword, newPassword);
		toasts.success('Password changed.');
	}
</script>

<svelte:head>
	<title>Account — Study Companion</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader title="Account" subtitle={student?.name} />

	<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
		<a href="/student" class="text-sm font-medium text-gray-500 hover:text-gray-700"> &larr; My Content </a>

		<section class="mt-6 rounded-xl border border-gray-200 bg-surface p-5">
			<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">Profile</h2>
			<dl class="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-xs font-medium tracking-wide text-gray-400 uppercase">Name</dt>
					<dd class="mt-0.5 text-gray-900">{student?.name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-medium tracking-wide text-gray-400 uppercase">Student code</dt>
					<dd class="mt-0.5 text-gray-900">{student?.studentCode ?? '—'}</dd>
				</div>
				{#if student?.college}
					<div>
						<dt class="text-xs font-medium tracking-wide text-gray-400 uppercase">College</dt>
						<dd class="mt-0.5 text-gray-900">{student.college.name}</dd>
					</div>
				{/if}
			</dl>
			<p class="mt-3 text-sm text-gray-500">
				These details are set by your institution. If something's wrong, contact them directly — there's no
				self-service edit here.
			</p>
		</section>

		<section class="mt-6 rounded-xl border border-gray-200 bg-surface p-5">
			<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">My courses</h2>
			<div class="mt-3">
				{#if loadingCourses}
					<p class="text-sm text-gray-500">Loading…</p>
				{:else if coursesError}
					<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
						<p>{coursesError}</p>
						<button
							type="button"
							class="mt-1 font-medium underline underline-offset-2"
							onclick={loadCourses}
						>
							Retry
						</button>
					</div>
				{:else if courses.length === 0}
					<p class="text-sm text-gray-500">You're not in any courses yet.</p>
				{:else}
					<ul class="flex flex-col gap-2">
						{#each courses as course (course.courseCode)}
							<li class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
								<span class="font-medium text-gray-900">{course.name}</span>
								<span class="text-gray-500"> · {course.courseCode}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<section class="mt-6 rounded-xl border border-gray-200 bg-surface p-5">
			<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">Change password</h2>
			<div class="mt-3 max-w-sm">
				<ChangePasswordForm onSubmit={handleChangePassword} />
			</div>
		</section>
	</main>
</div>
