<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { uploadNote } from '$lib/api/instructor';
	import { ApiError } from '$lib/api/client';
	import { instructorCourses } from '$lib/stores/instructor-courses.svelte';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import TextField from '$lib/components/TextField.svelte';
	import TextAreaField from '$lib/components/TextAreaField.svelte';
	import FileField from '$lib/components/FileField.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormError from '$lib/components/FormError.svelte';

	const courseId = $derived(page.params.courseId as string);
	const course = $derived(instructorCourses.find(courseId));

	$effect(() => {
		instructorCourses.ensureLoaded();
	});

	let mode = $state<'paste' | 'file'>('paste');
	let title = $state('');
	let chapterLabel = $state('');
	let pastedText = $state('');
	let file = $state<File | null>(null);

	let step = $state<'form' | 'confirm'>('form');
	let validationError = $state<string | null>(null);
	let submitError = $state<string | null>(null);
	let submitting = $state(false);

	function goToConfirm() {
		validationError = null;
		if (mode === 'paste' && pastedText.trim().length === 0) {
			validationError = 'Paste in the note text first.';
			return;
		}
		if (mode === 'file' && file === null) {
			validationError = 'Choose a file first.';
			return;
		}
		step = 'confirm';
	}

	async function confirmUpload() {
		submitting = true;
		submitError = null;
		try {
			const res = await uploadNote({
				courseId,
				title: title.trim() || undefined,
				chapterLabel: chapterLabel.trim() || undefined,
				pastedText: mode === 'paste' ? pastedText : undefined,
				file: mode === 'file' ? (file ?? undefined) : undefined
			});
			// Phase 12: Instructor is self-serve end to end now - land on
			// this note's own review screen so Generate is the obvious next
			// step, instead of back on the course list (Phase 7 behavior,
			// from when Admin/Moderator did generate/publish separately).
			await goto(`/instructor/courses/${courseId}/notes/${res.id}`);
		} catch (err) {
			submitError = err instanceof ApiError ? err.message : 'Could not upload this note. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Upload Note — Study Companion</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-surface px-4 py-4 sm:px-6">
		<div class="mx-auto max-w-2xl">
			<h1 class="text-lg font-semibold text-gray-900">Upload Note</h1>
			<p class="text-sm text-gray-500">{course?.name ?? 'Course'} · {course?.courseCode ?? ''}</p>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
		<a href={`/instructor/courses/${courseId}`} class="text-sm font-medium text-gray-500 hover:text-gray-700">
			&larr; Back to course
		</a>

		<div class="mt-6 rounded-xl border border-gray-200 bg-surface p-6">
			{#if step === 'form'}
				<div class="flex flex-col gap-4">
					<TextField label="Title (optional)" bind:value={title} placeholder="Defaults to the file name or a generated title" />
					<TextField label="Chapter label (optional)" bind:value={chapterLabel} placeholder="e.g. Chapter 3" />

					<div>
						<p class="mb-1.5 text-sm font-medium text-gray-700">Source</p>
						<SegmentedToggle
							options={[
								{ label: 'Paste text', value: 'paste' },
								{ label: 'Upload file', value: 'file' }
							]}
							bind:value={mode}
						/>
					</div>

					{#if mode === 'paste'}
						<TextAreaField label="Note text" bind:value={pastedText} rows={12} placeholder="Paste the note content here…" />
					{:else}
						<FileField label="File" bind:file accept=".pdf,.docx" />
					{/if}

					{#if validationError}
						<FormError message={validationError} />
					{/if}

					<Button class="mt-2" onclick={goToConfirm}>Continue</Button>
				</div>
			{:else}
				<div class="flex flex-col gap-4">
					<div>
						<p class="text-sm font-medium text-gray-700">Title</p>
						<p class="mt-0.5 text-sm text-gray-900">{title.trim() || '(will be generated automatically)'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-700">Chapter label</p>
						<p class="mt-0.5 text-sm text-gray-900">{chapterLabel.trim() || '(none)'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-700">Source</p>
						<p class="mt-0.5 text-sm text-gray-900">
							{mode === 'paste' ? `Pasted text (${pastedText.trim().length.toLocaleString()} characters)` : file?.name}
						</p>
					</div>

					<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
						Once uploaded, this note can't be edited - if something's off, you'll upload it again.
					</div>

					{#if submitError}
						<FormError message={submitError} />
					{/if}

					<div class="mt-2 flex gap-3">
						<Button variant="secondary" disabled={submitting} onclick={() => (step = 'form')}>Back</Button>
						<Button loading={submitting} onclick={confirmUpload} class="flex-1">Confirm &amp; Upload</Button>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>
