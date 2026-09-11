<script lang="ts">
	import type { StudentSummary } from '$lib/types';
	import { formatDuration, formatShortDate } from '$lib/format';
	import Badge from './Badge.svelte';
	import WeeklyActivityChart from './WeeklyActivityChart.svelte';
	import Flame from '@lucide/svelte/icons/flame';
	import Gauge from '@lucide/svelte/icons/gauge';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

	interface Props {
		student: StudentSummary;
	}

	let { student }: Props = $props();

	const chapterTests = $derived(student?.chapterTests ?? []);
	const weeklyActivityByDay = $derived(student?.weeklyActivityByDay ?? [0, 0, 0, 0, 0, 0, 0]);

	const engagementTone: Record<StudentSummary['engagement'], 'success' | 'warning' | 'danger'> = {
		engaged: 'success',
		moderate: 'warning',
		'at-risk': 'danger'
	};

	const engagementLabel: Record<StudentSummary['engagement'], string> = {
		engaged: 'Engaged',
		moderate: 'Moderate',
		'at-risk': 'At risk'
	};

	const engagementIcon = {
		engaged: Flame,
		moderate: Gauge,
		'at-risk': AlertTriangle
	};
</script>

<div class="rounded-xl border border-gray-200 bg-surface p-5">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="font-medium text-gray-900">{student.name}</p>
			<p class="font-mono-nums text-sm text-gray-500">{student.studentCode}</p>
		</div>
		<Badge tone={engagementTone[student.engagement]}>
			{@const Icon = engagementIcon[student.engagement]}
			<span class="flex items-center gap-1">
				<Icon size={12} aria-hidden="true" />
				{engagementLabel[student.engagement]}
			</span>
		</Badge>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-4 text-sm">
		<div>
			<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Total study time</p>
			<p class="mt-0.5 text-gray-900">{formatDuration(student.totalStudySeconds)}</p>
		</div>
		<div>
			<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Last studied</p>
			<p class="mt-0.5 text-gray-900">
				{student.lastStudiedAt ? formatShortDate(student.lastStudiedAt) : 'Never'}
				{#if student.lastStudiedChapterTitle}
					<span class="text-gray-400">· {student.lastStudiedChapterTitle}</span>
				{/if}
			</p>
		</div>
		<div class="col-span-2">
			<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Most studied</p>
			<p class="mt-0.5 truncate text-gray-900">
				{#if student.mostStudiedContent}
					{student.mostStudiedContent.title}
					{#if student.mostStudiedContent.chapterTitle}
						<span class="text-gray-400">· {student.mostStudiedContent.chapterTitle}</span>
					{/if}
					<span class="text-gray-400">· {formatDuration(student.mostStudiedContent.seconds)}</span>
				{:else}
					—
				{/if}
			</p>
		</div>
	</div>

	<div class="mt-4">
		<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">This week</p>
		<div class="mt-1">
			<WeeklyActivityChart secondsByDay={weeklyActivityByDay} />
		</div>
	</div>

	{#if chapterTests.length > 0}
		<div class="mt-4">
			<p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Chapter tests</p>
			<div class="mt-1.5 flex flex-col gap-1.5">
				{#each chapterTests as test (test.noteId)}
					<div class="flex items-center justify-between gap-2 text-sm">
						<span class="min-w-0 truncate text-gray-700">
							{test.chapterLabel ?? test.noteTitle}
						</span>
						<span class="font-mono-nums shrink-0 font-medium text-gray-900">{test.score}/{test.totalQuestions}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
