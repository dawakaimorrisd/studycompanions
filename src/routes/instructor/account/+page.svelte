<script lang="ts">
	import { session } from '$lib/stores/session.svelte';
	import { changeInstructorPassword } from '$lib/api/auth';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import InstructorNav from '$lib/components/InstructorNav.svelte';
	import ChangePasswordForm from '$lib/components/ChangePasswordForm.svelte';

	const instructor = $derived(session.current?.instructor ?? null);

	$effect(() => {
		instructorCourses.ensureLoaded();
	});

	async function handleChangePassword(currentPassword: string, newPassword: string) {
		await changeInstructorPassword(currentPassword, newPassword);
		toasts.success('Password changed.');
	}
</script>

<svelte:head>
	<title>Account — Study Companion</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader title="Account" subtitle={instructor?.name} />
	<InstructorNav />

	<main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
		<section class="rounded-xl border border-gray-200 bg-surface p-5">
			<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">Profile</h2>
			<dl class="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-xs font-medium tracking-wide text-gray-400 uppercase">Name</dt>
					<dd class="mt-0.5 text-gray-900">{instructor?.name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-medium tracking-wide text-gray-400 uppercase">Role</dt>
					<dd class="mt-0.5 text-gray-900">Instructor</dd>
				</div>
			</dl>
		</section>

		<section class="mt-6 rounded-xl border border-gray-200 bg-surface p-5">
			<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">Assigned courses</h2>
			<div class="mt-3">
				{#if instructorCourses.loading && !instructorCourses.loaded}
					<p class="text-sm text-gray-500">Loading…</p>
				{:else if instructorCourses.error}
					<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
						<p>{instructorCourses.error}</p>
						<button
							type="button"
							class="mt-1 font-medium underline underline-offset-2"
							onclick={() => instructorCourses.reload()}
						>
							Retry
						</button>
					</div>
				{:else if instructorCourses.courses.length === 0}
					<p class="text-sm text-gray-500">
						You haven't been assigned a course yet. Check back once an admin sets one up for you.
					</p>
				{:else}
					<ul class="flex flex-col gap-2">
						{#each instructorCourses.courses as course (course.id)}
							<li class="rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
								<span class="font-medium text-gray-900">{course.name}</span>
								<span class="text-gray-500"> · {course.courseCode}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<p class="mt-3 text-sm text-gray-500">
				Course assignments are managed by an admin — there's no self-service request or edit here.
			</p>
		</section>

		<section class="mt-6 rounded-xl border border-gray-200 bg-surface p-5">
			<h2 class="text-sm font-semibold tracking-wide text-gray-500 uppercase">Change password</h2>
			<div class="mt-3 max-w-sm">
				<ChangePasswordForm onSubmit={handleChangePassword} tone="instructor" />
			</div>
		</section>
	</main>
</div>
