<script lang="ts">
	// The whole point: there's no pre-existing "assignment" to pick from -
	// the instructor's homework was given in class, never entered into the
	// app by anyone. This screen is where a student turns their completed
	// work into the app's only record of it: pick the course, describe
	// what it is, upload it. That single action creates both the
	// assignment and the submission at once.
	//
	// Calls createMyAssignment() / getCourseEligibleGroupMembers(), which
	// hit endpoints that don't exist yet - see api/submissions.ts and the
	// backend handoff doc's "Student-originated homework" section.
	import { goto } from '$app/navigation';
	import { createMyAssignment, getCourseEligibleGroupMembers } from '$lib/api/submissions';
	import { ApiError } from '$lib/api/client';
	import { studentCourses } from '$lib/stores/student-courses.svelte';
	import type { AssignmentType, StudentPickable } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import TextField from '$lib/components/TextField.svelte';
	import FileField from '$lib/components/FileField.svelte';
	import FormError from '$lib/components/FormError.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import Button from '$lib/components/Button.svelte';

	$effect(() => {
		studentCourses.ensureLoaded();
	});

	let courseId = $state('');
	let title = $state('');
	let type = $state<AssignmentType>('INDIVIDUAL');
	let file = $state<File | null>(null);
	let groupName = $state('');

	let members = $state<StudentPickable[]>([]);
	let membersLoading = $state(false);
	let membersError = $state<string | null>(null);
	let selectedMemberIds = $state<Set<string>>(new Set());

	let validationError = $state<string | null>(null);
	let submitError = $state<string | null>(null);
	let submitting = $state(false);

	$effect(() => {
		if (courseId && type === 'GROUP') loadMembers(courseId);
	});

	async function loadMembers(id: string) {
		membersLoading = true;
		membersError = null;
		try {
			const res = await getCourseEligibleGroupMembers(id);
			members = res.students;
		} catch (err) {
			membersError = err instanceof ApiError ? err.message : 'Could not load eligible classmates.';
		} finally {
			membersLoading = false;
		}
	}

	function toggleMember(id: string) {
		const next = new Set(selectedMemberIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedMemberIds = next;
	}

	async function handleSubmit() {
		validationError = null;
		submitError = null;

		if (!courseId) {
			validationError = 'Choose which course this is for.';
			return;
		}
		if (!file) {
			validationError = 'Choose a file to upload.';
			return;
		}
		if (type === 'GROUP' && groupName.trim().length === 0) {
			validationError = 'Give your group a name.';
			return;
		}

		submitting = true;
		try {
			const res = await createMyAssignment({
				courseId,
				title: title.trim() || undefined,
				type,
				file,
				groupName: type === 'GROUP' ? groupName.trim() : undefined,
				memberStudentIds: type === 'GROUP' ? Array.from(selectedMemberIds) : undefined
			});
			await goto(`/student/assignments/${res.assignmentId}`);
		} catch (err) {
			submitError = err instanceof ApiError ? err.message : 'Could not submit this.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Submit Homework — Study Companion</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader title="Submit Homework" backHref="/student/assignments" backLabel="My Homework" />

	<main class="mx-auto max-w-xl px-4 py-8 sm:px-6">
		<div class="rounded-xl border border-gray-200 bg-surface p-5">
			<div class="flex flex-col gap-4">
				<SelectField
					label="Course"
					bind:value={courseId}
					options={studentCourses.courses.map((c) => ({ value: c.id, label: `${c.name} (${c.courseCode})` }))}
					placeholder={studentCourses.loading ? 'Loading courses…' : 'Choose a course'}
				/>

				<TextField label="Title (optional)" bind:value={title} placeholder="e.g. Chapter 4 problem set" />

				<div>
					<p class="mb-1.5 text-sm font-medium text-gray-700">Submitting as</p>
					<SegmentedToggle
						options={[
							{ label: 'Just me', value: 'INDIVIDUAL' },
							{ label: 'My group', value: 'GROUP' }
						]}
						bind:value={type}
					/>
				</div>

				{#if type === 'GROUP'}
					<TextField label="Group name" bind:value={groupName} placeholder="e.g. Team Alpha" />

					<div>
						<p class="mb-1.5 text-sm font-medium text-gray-700">Group members</p>
						{#if !courseId}
							<p class="text-sm text-gray-500">Choose a course first.</p>
						{:else if membersLoading}
							<p class="text-sm text-gray-500">Loading classmates…</p>
						{:else if membersError}
							<p class="text-sm text-red-600">{membersError}</p>
						{:else if members.length === 0}
							<p class="text-sm text-gray-500">No eligible classmates found.</p>
						{:else}
							<div class="flex flex-col gap-1.5">
								{#each members as member (member.id)}
									<label
										class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
									>
										<input
											type="checkbox"
											class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
											checked={selectedMemberIds.has(member.id)}
											onchange={() => toggleMember(member.id)}
										/>
										<span class="text-sm text-gray-900">{member.name}</span>
										<span class="text-xs text-gray-400">{member.studentCode}</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<FileField label="File" bind:file accept=".pdf,.docx" />

				{#if validationError}
					<FormError message={validationError} />
				{/if}
				{#if submitError}
					<FormError message={submitError} />
				{/if}

				<Button loading={submitting} onclick={handleSubmit}>Submit</Button>
			</div>
		</div>
	</main>
</div>
