<script lang="ts">
	// Student-originated homework: this assignment IS a submission (yours,
	// or one you're tagged in as a group member) - there's no separate
	// "task" anyone published that you're reading before deciding whether
	// to submit. Reading it means reading your own (or your group's)
	// completed work, as a PDF.
	//
	// No Start/End Study tracking here by design - confirmed "NOTES ONLY"
	// in the backend handoff. Drill and Dictionary work off the generated
	// questionUnits, same as before. Share is new here: folded in from
	// the old separate /submit page now that submission happens at
	// creation time (see /student/assignments/new) instead of after
	// the fact - only shown to the creator (`isSubmitter`) of a GROUP
	// homework.

	import { page } from '$app/state';
	import { getAssignment } from '$lib/api/content';
	import {
		getMySubmission,
		generateSubmission,
		getSubmissionEligibleRecipients,
		distributeSubmission
	} from '$lib/api/submissions';
	import { ApiError } from '$lib/api/client';
	import { downloads } from '$lib/offline/downloads.svelte';
	import type { AssignmentContent, MySubmission, OptionKey, StudentPickable } from '$lib/types';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import PdfViewer from '$lib/components/PdfViewer.svelte';
	import DictionaryTab from '$lib/components/reader/DictionaryTab.svelte';
	import AssignmentDrillPanel from '$lib/components/reader/AssignmentDrillPanel.svelte';
	import PaginatedQuestions from '$lib/components/reader/PaginatedQuestions.svelte';
	import DownloadButton from '$lib/components/DownloadButton.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Library from '@lucide/svelte/icons/library';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Send from '@lucide/svelte/icons/send';
	import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
	import Award from '@lucide/svelte/icons/award';
	import Target from '@lucide/svelte/icons/target';

	const assignmentId = $derived(page.params.id as string);

	let assignment = $state<AssignmentContent | null>(null);
	let mySubmission = $state<MySubmission | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let usingOfflineCopy = $state(false);

	let drillActive = $state(false);

	// Background polling for the worker-based PDF/generation process.
	let processingTimer: ReturnType<typeof setTimeout> | null = null;

	type Tab = 'read' | 'drill' | 'dictionary' | 'share';
	let activeTab = $state<Tab>('read');

	function stopProcessingPolling() {
		if (processingTimer) {
			clearTimeout(processingTimer);
			processingTimer = null;
		}
	}

	async function pollProcessingStatus(id: string) {
		if (usingOfflineCopy) return;

		try {
			const [assignmentRes, submissionRes] = await Promise.all([
				getAssignment(id),
				getMySubmission(id)
			]);

			assignment = assignmentRes;
			mySubmission = submissionRes.submission;
			drillActive = Boolean(assignment.drills?.inProgressAttemptId);

			const status = submissionRes.submission?.processingStatus;

			if (status === 'PROCESSING') {
				processingTimer = setTimeout(() => {
					void pollProcessingStatus(id);
				}, 2000);
			} else {
				// READY or FAILED - the worker has finished.
				stopProcessingPolling();
			}
		} catch {
			// A temporary polling failure should not destroy the page state.
			// Retry shortly and keep displaying the current assignment.
			processingTimer = setTimeout(() => {
				void pollProcessingStatus(id);
			}, 3000);
		}
	}

	async function load(id: string) {
		stopProcessingPolling();

		loading = true;
		error = null;
		assignment = null;
		mySubmission = null;
		usingOfflineCopy = false;

		await downloads.ensureLoaded();

		try {
			const [assignmentRes, submissionRes] = await Promise.all([
				getAssignment(id),
				getMySubmission(id)
			]);

			assignment = assignmentRes;
			mySubmission = submissionRes.submission;
			drillActive = Boolean(assignment.drills?.inProgressAttemptId);

			// The assignment is processed asynchronously by the backend worker.
			// Start silent polling only while processing is still underway.
			if (
				submissionRes.submission?.processingStatus === 'PROCESSING'
			) {
				processingTimer = setTimeout(() => {
					void pollProcessingStatus(id);
				}, 2000);
			}
		} catch (err) {
			const cached = downloads.get('assignment', id);

			if (cached) {
				assignment = cached.content as AssignmentContent;
				usingOfflineCopy = true;
				drillActive = Boolean(assignment.drills?.inProgressAttemptId);
			} else {
				error =
					err instanceof ApiError
						? err.message
						: 'Could not load this assignment.';
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load(assignmentId);
		activeTab = 'read';

		return () => {
			stopProcessingPolling();
		};
	});

	// Same UX as the old ContentReader gating: once a drill attempt is in
	// progress, other tabs are hidden until it's submitted, so the student
	// can't step away mid-attempt and lose their place.
	$effect(() => {
		if (drillActive && activeTab !== 'drill') {
			activeTab = 'drill';
		}
	});

	const canShare = $derived(
		mySubmission?.isSubmitter === true &&
		mySubmission?.type === 'GROUP'
	);

	function selectTab(tab: Tab) {
		if (drillActive && tab !== 'drill') return;
		activeTab = tab;
	}

	function handleDrillStateChange(active: boolean) {
		drillActive = active;
	}

	function handleSubmitted() {
		drillActive = false;
	}

	const tabs = $derived(
		drillActive
			? [{ id: 'drill' as const, label: 'Drill', icon: ClipboardCheck }]
			: [
					{ id: 'read' as const, label: 'Read', icon: BookOpen },
					{ id: 'drill' as const, label: 'Drill', icon: ClipboardCheck },
					{ id: 'dictionary' as const, label: 'Dictionary', icon: Library },
					...(canShare
						? [{ id: 'share' as const, label: 'Share', icon: Share2 }]
						: [])
				]
	);

	// ---- Share tab: generate (if needed) + self-drill + send to classmates ----
	let generating = $state(false);
	let generateError = $state<string | null>(null);

	async function handleGenerate() {
		if (!mySubmission) return;

		generating = true;
		generateError = null;

		try {
			const res = await generateSubmission(mySubmission.id);

			mySubmission = {
				...mySubmission,
				generatedAt: res.generatedAt,
				questionUnits: res.questionUnits,
				processingStatus: 'READY'
			};

			if (assignment) {
				assignment = {
					...assignment,
					generatedAt: res.generatedAt,
					questionUnits: res.questionUnits
				};
			}
		} catch (err) {
			generateError =
				err instanceof ApiError
					? err.message
					: 'Could not generate study material from this file.';
		} finally {
			generating = false;
		}
	}

	let selfDrillPhase = $state<'idle' | 'in-progress' | 'submitted'>('idle');
	let selfDrillSelections = $state<Record<string, OptionKey | undefined>>({});
	let selfDrillScore = $state<number | null>(null);

	function startSelfDrill() {
		selfDrillSelections = {};
		selfDrillScore = null;
		selfDrillPhase = 'in-progress';
	}

	function submitSelfDrill() {
		if (!mySubmission) return;

		let correct = 0;

		for (const unit of mySubmission.questionUnits) {
			if (selfDrillSelections[unit.id] === unit.correctOption) {
				correct += 1;
			}
		}

		selfDrillScore = correct;
		selfDrillPhase = 'submitted';
	}

	let recipients = $state<StudentPickable[]>([]);
	let recipientsLoading = $state(false);
	let recipientsError = $state<string | null>(null);
	let recipientsLoaded = $state(false);
	let selectedRecipientIds = $state<Set<string>>(new Set());
	let sending = $state(false);
	let sendError = $state<string | null>(null);
	let sendResult = $state<{
		sentCount: number;
		skippedCount: number;
	} | null>(null);

	async function loadRecipients() {
		if (!mySubmission) return;

		recipientsLoading = true;
		recipientsError = null;

		try {
			const res = await getSubmissionEligibleRecipients(mySubmission.id);
			recipients = res.students;
			recipientsLoaded = true;
		} catch (err) {
			recipientsError =
				err instanceof ApiError
					? err.message
					: 'Could not load eligible classmates.';
		} finally {
			recipientsLoading = false;
		}
	}

	function toggleRecipient(id: string) {
		const next = new Set(selectedRecipientIds);

		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}

		selectedRecipientIds = next;
	}

	async function handleSend() {
		if (!mySubmission || selectedRecipientIds.size === 0) return;

		sending = true;
		sendError = null;
		sendResult = null;

		try {
			const res = await distributeSubmission(
				mySubmission.id,
				Array.from(selectedRecipientIds)
			);

			sendResult = {
				sentCount: res.sentCount,
				skippedCount: res.skippedCount
			};

			selectedRecipientIds = new Set();
		} catch (err) {
			sendError =
				err instanceof ApiError
					? err.message
					: 'Could not send this to your classmates.';
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>
		{assignment ? `${assignment.title} — Study Companion` : 'Assignment — Study Companion'}
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<AppHeader
		title={assignment?.title ?? 'Assignment'}
		subtitle={
			assignment
				? `${assignment.course?.name ?? ''} · ${assignment.course?.courseCode ?? ''}`
				: undefined
		}
		backHref="/student/assignments"
		backLabel="My Homework"
	>
		{#snippet actions()}
			{#if assignment}
				<DownloadButton
					kind="assignment"
					id={assignmentId}
					title={assignment.title}
					courseName={assignment.course?.name ?? ''}
					courseCode={assignment.course?.courseCode ?? ''}
				/>
			{/if}
		{/snippet}
	</AppHeader>

	<main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		{#if loading}
			<p class="text-sm text-gray-500">Loading…</p>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				<p>{error}</p>
				<button
					type="button"
					class="mt-1 font-medium underline underline-offset-2"
					onclick={() => load(assignmentId)}
				>
					Retry
				</button>
			</div>
		{:else if assignment}
			{@const currentAssignment = assignment}

			{#if usingOfflineCopy}
				<div class="mb-4">
					<Badge tone="brand">Viewing your downloaded offline copy</Badge>
				</div>
			{/if}

			{#if mySubmission?.processingStatus === 'PROCESSING'}
				<div class="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
					<div class="flex items-center gap-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700"
							aria-hidden="true"
						></div>
						<span>
							Your homework is being processed. The PDF and study material will appear
							automatically when they're ready.
						</span>
					</div>
				</div>
			{/if}

			{#if mySubmission?.processingStatus === 'FAILED'}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					Your homework processing could not be completed.
					{#if mySubmission.generationError}
						<span>{mySubmission.generationError}</span>
					{:else if mySubmission.pdfConversionError}
						<span>{mySubmission.pdfConversionError}</span>
					{/if}
				</div>
			{/if}

			{#if mySubmission?.type === 'GROUP'}
				<p class="mb-3 text-sm text-gray-500">
					{mySubmission.groupName} · submitted by {mySubmission.submittedBy.name}
					{#if mySubmission.members.length > 0}
						· with {mySubmission.members.map((m) => m.name).join(', ')}
					{/if}
				</p>
			{/if}

			<div class="flex gap-1 border-b border-gray-200">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						class={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
							activeTab === tab.id
								? 'border-brand-600 text-brand-700'
								: 'border-transparent text-gray-500 hover:text-gray-700'
						}`}
						onclick={() => selectTab(tab.id)}
					>
						<tab.icon size={15} aria-hidden="true" />
						{tab.label}
					</button>
				{/each}
			</div>

			<div class="py-5">
				{#if activeTab === 'read'}
					<PdfViewer
						pdfUrl={currentAssignment.pdfUrl}
						fileName={currentAssignment.title}
						unavailableMessage={
							currentAssignment.pdfConversionError ??
							"This file's preview isn't available yet."
						}
					/>
				{:else if activeTab === 'drill'}
					<AssignmentDrillPanel
						assignment={currentAssignment}
						submissionId={mySubmission?.id}
						onSubmitted={handleSubmitted}
						onDrillStateChange={handleDrillStateChange}
					/>
				{:else if activeTab === 'dictionary'}
					<DictionaryTab
						questionUnits={currentAssignment.questionUnits}
						generatedAt={currentAssignment.generatedAt}
					/>
				{:else if activeTab === 'share' && mySubmission}
					{@const sub = mySubmission}

					<div class="flex flex-col gap-5">
						<div class="rounded-xl border border-gray-200 bg-surface p-5">
							{#if sub.generatedAt === null}
								<div class="flex flex-col items-center gap-3 text-center">
									<Sparkles
										size={22}
										class="text-gray-300"
										aria-hidden="true"
									/>

									<p class="text-sm text-gray-600">
										Generate study questions from this homework - drill them yourself, or share
										them with your group.
									</p>

									{#if generateError}
										<p class="text-sm text-red-600">{generateError}</p>
									{/if}

									<Button loading={generating} onclick={handleGenerate}>
										<Sparkles size={15} aria-hidden="true" />
										Generate Study Material
									</Button>
								</div>
							{:else}
								<h2 class="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
									Drill your own submission
								</h2>

								{#if selfDrillPhase === 'idle'}
									<div class="rounded-lg border border-dashed border-gray-300 p-6 text-center">
										<Target
											size={20}
											class="mx-auto text-gray-400"
											aria-hidden="true"
										/>

										<p class="mt-2 text-sm text-gray-600">
											Answer every question, then check your score.
										</p>

										<Button class="mt-3" onclick={startSelfDrill}>
											Start Drill
										</Button>
									</div>
								{:else if selfDrillPhase === 'in-progress'}
									<PaginatedQuestions
										questionUnits={sub.questionUnits.map((u) => ({
											...u,
											correctOption: null,
											explanation: null
										}))}
										mode="select"
										bind:selections={selfDrillSelections}
									/>

									<Button class="mt-3" onclick={submitSelfDrill}>
										Submit Drill
									</Button>
								{:else if selfDrillPhase === 'submitted' && selfDrillScore !== null}
									<div
										class="flex items-center gap-3 rounded-lg border border-instructor-200 bg-instructor-50 px-4 py-3 text-instructor-800"
									>
										<Award
											size={20}
											class="shrink-0"
											aria-hidden="true"
										/>

										<p class="text-sm">
											You scored
											<span class="font-mono-nums font-display text-lg font-semibold">
												{selfDrillScore}/{sub.questionUnits.length}
											</span>
										</p>
									</div>

									<div class="mt-3">
										<PaginatedQuestions
											questionUnits={sub.questionUnits}
											mode="review"
											pickedOptions={selfDrillSelections}
										/>
									</div>

									<Button
										variant="secondary"
										class="mt-3"
										onclick={startSelfDrill}
									>
										<RefreshCcw size={15} aria-hidden="true" />
										Start a New Drill
									</Button>
								{/if}
							{/if}
						</div>

						{#if sub.generatedAt !== null}
							<div class="rounded-xl border border-gray-200 bg-surface p-5">
								<h2
									class="mb-1 flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase"
								>
									<Share2 size={13} aria-hidden="true" />
									Share with classmates
								</h2>

								<p class="mb-3 text-sm text-gray-500">
									They'll get the same drill, gated the same way real assignments are - they
									answer first, then see the correct answers.
								</p>

								{#if !recipientsLoaded}
									<Button
										variant="secondary"
										loading={recipientsLoading}
										onclick={loadRecipients}
									>
										Choose classmates
									</Button>
								{:else if recipientsError}
									<p class="text-sm text-red-600">{recipientsError}</p>
								{:else if recipients.length === 0}
									<p class="text-sm text-gray-500">
										No eligible classmates found right now.
									</p>
								{:else}
									<div class="flex flex-col gap-1.5">
										{#each recipients as recipient (recipient.id)}
											<label
												class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
											>
												<input
													type="checkbox"
													class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
													checked={selectedRecipientIds.has(recipient.id)}
													onchange={() => toggleRecipient(recipient.id)}
												/>

												<span class="text-sm text-gray-900">{recipient.name}</span>
												<span class="text-xs text-gray-400">{recipient.studentCode}</span>
											</label>
										{/each}
									</div>

									{#if sendError}
										<p class="mt-3 text-sm text-red-600">{sendError}</p>
									{/if}

									{#if sendResult}
										<div
											class="mt-3 rounded-lg border border-instructor-200 bg-instructor-50 px-3 py-2.5 text-sm text-instructor-800"
										>
											Sent to {sendResult.sentCount}
											{sendResult.sentCount === 1 ? 'classmate' : 'classmates'}.
											{#if sendResult.skippedCount > 0}
												{sendResult.skippedCount}
												{sendResult.skippedCount === 1 ? 'recipient was' : 'recipients were'}
												no longer eligible.
											{/if}
										</div>
									{/if}

									<Button
										class="mt-4"
										loading={sending}
										disabled={selectedRecipientIds.size === 0}
										onclick={handleSend}
									>
										<Send size={15} aria-hidden="true" />
										Send to {selectedRecipientIds.size || ''}
										{selectedRecipientIds.size === 1 ? 'classmate' : 'classmates'}
									</Button>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>