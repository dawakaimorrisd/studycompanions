<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.svelte';
	import { toasts } from '$lib/stores/toasts.svelte';
	import { ApiError } from '$lib/api/client';
	import { fetchColleges, instructorLogin, studentLogin, studentSignup } from '$lib/api/auth';
	import { getInstructorMe, getStudentMe } from '$lib/api/me';
	import type { College } from '$lib/types';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import TextField from '$lib/components/TextField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormError from '$lib/components/FormError.svelte';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import BookOpen from '@lucide/svelte/icons/book-open';

	// Already signed in? Nothing to do here.
	$effect(() => {
		if (session.current !== null) {
			goto(session.role === 'student' ? '/student' : '/instructor');
		}
	});

	let role = $state<'instructor' | 'student'>('student');
	let studentMode = $state<'login' | 'signup'>('login');

	// Instructor login fields
	let instructorName = $state('');
	let instructorPassword = $state('');

	// Student login fields
	let loginStudentCode = $state('');
	let loginPassword = $state('');

	// Student signup fields
	let signupName = $state('');
	let signupStudentCode = $state('');
	let signupPassword = $state('');
	let signupCollegeId = $state('');

	let colleges = $state<College[]>([]);
	let collegesLoading = $state(false);
	let collegesError = $state<string | null>(null);

	let submitting = $state(false);
	let formError = $state<string | null>(null);
	let conflictStudentCode = $state<string | null>(null);

	/**
	 * Phase 10 §1: login/signup responses don't carry semester/paid/enrolled
	 * - only `/me` does. Fetched here, right after `session.set`, so the
	 * very first screen the user lands on already knows whether to show
	 * the access-pending state instead of flashing the dashboard first.
	 * If this fails (e.g. flaky network right after login), it's not
	 * fatal - the destination layout's own guard calls `/me` again on
	 * mount and will pick it up.
	 */
	async function primeStudentMe() {
		try {
			const me = await getStudentMe();
			session.applyMe({ semester: me.semester, paid: me.paid, enrolled: me.enrolled });
		} catch {
			// Layout guard retries on mount.
		}
	}

	async function primeInstructorMe() {
		try {
			const me = await getInstructorMe();
			session.applyMe({ semester: me.semester, paid: me.paid });
		} catch {
			// Layout guard retries on mount.
		}
	}

	async function loadColleges() {
		if (colleges.length > 0 || collegesLoading) return;
		collegesLoading = true;
		collegesError = null;
		try {
			colleges = await fetchColleges();
		} catch (err) {
			collegesError =
				err instanceof ApiError ? err.message : 'Could not load colleges. Please try again.';
		} finally {
			collegesLoading = false;
		}
	}

	$effect(() => {
		if (role === 'student' && studentMode === 'signup') {
			loadColleges();
		}
	});

	function switchToStudentLogin(prefillCode?: string) {
		role = 'student';
		studentMode = 'login';
		formError = null;
		if (prefillCode) loginStudentCode = prefillCode;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formError = null;
		conflictStudentCode = null;
		submitting = true;

		try {
			if (role === 'instructor') {
				const res = await instructorLogin(instructorName, instructorPassword);
				session.set({
					token: res.token,
					expiresAt: res.expiresAt,
					role: 'instructor',
					instructor: res.instructor
				});
				await primeInstructorMe();
				await goto('/instructor');
				return;
			}

			if (studentMode === 'login') {
				const res = await studentLogin(loginStudentCode, loginPassword);
				session.set({
					token: res.token,
					expiresAt: res.expiresAt,
					role: 'student',
					student: res.student
				});
				await primeStudentMe();
				await goto('/student');
				return;
			}

			// Student signup
			if (!signupCollegeId) {
				formError = 'Please select a college.';
				return;
			}
			const res = await studentSignup({
				name: signupName,
				studentCode: signupStudentCode,
				password: signupPassword,
				collegeId: signupCollegeId
			});
			session.set({
				token: res.token,
				expiresAt: res.expiresAt,
				role: 'student',
				student: res.student
			});
			await primeStudentMe();
			toasts.success('Account created.');
			await goto('/student');
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.code === 'conflict') {
					formError = err.message;
					conflictStudentCode = signupStudentCode;
				} else {
					formError = err.message;
				}
			} else {
				formError = 'Something went wrong. Please try again.';
			}
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Log in — Study Companion</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
	<div class="w-full max-w-sm rounded-xl border border-gray-200 bg-surface p-8 shadow-sm">
		<div class="flex items-center justify-center gap-2">
			<BookOpen size={22} class="text-brand-600" aria-hidden="true" />
			<h1 class="font-display text-xl font-semibold text-gray-900">Study Companion</h1>
		</div>

		<div class="mt-6 grid grid-cols-2 gap-3">
			<button
				type="button"
				onclick={() => (role = 'student')}
				class={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition ${
					role === 'student'
						? 'border-brand-500 bg-brand-50 text-brand-800'
						: 'border-gray-200 text-gray-500 hover:border-gray-300'
				}`}
			>
				<BookOpen size={22} aria-hidden="true" />
				<span class="text-sm font-medium">Student</span>
			</button>
			<button
				type="button"
				onclick={() => (role = 'instructor')}
				class={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition ${
					role === 'instructor'
						? 'border-instructor-500 bg-instructor-50 text-instructor-800'
						: 'border-gray-200 text-gray-500 hover:border-gray-300'
				}`}
			>
				<GraduationCap size={22} aria-hidden="true" />
				<span class="text-sm font-medium">Instructor</span>
			</button>
		</div>

		{#if role === 'student'}
			<div class="mt-4">
				<SegmentedToggle
					options={[
						{ label: 'Log in', value: 'login' },
						{ label: 'Sign up', value: 'signup' }
					]}
					bind:value={studentMode}
				/>
			</div>
		{/if}

		<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit}>
			{#if role === 'instructor'}
				<TextField label="Name" bind:value={instructorName} autocomplete="username" />
				<TextField
					label="Password"
					type="password"
					bind:value={instructorPassword}
					autocomplete="current-password"
				/>
			{:else if studentMode === 'login'}
				<TextField label="Student Code" bind:value={loginStudentCode} autocomplete="username" />
				<TextField
					label="Password"
					type="password"
					bind:value={loginPassword}
					autocomplete="current-password"
				/>
			{:else}
				<TextField label="Name" bind:value={signupName} autocomplete="name" />
				<TextField label="Student Code" bind:value={signupStudentCode} autocomplete="off" />
				<TextField
					label="Password"
					type="password"
					bind:value={signupPassword}
					autocomplete="new-password"
					placeholder="At least 8 characters"
				/>
				{#if collegesError}
					<FormError message={collegesError} actionLabel="Retry" onaction={loadColleges} />
				{:else}
					<SelectField
						label="College"
						bind:value={signupCollegeId}
						options={colleges.map((c) => ({ label: c.name, value: c.id }))}
						disabled={collegesLoading}
						placeholder={collegesLoading ? 'Loading colleges…' : 'Select your college'}
					/>
				{/if}
			{/if}

			{#if formError}
				<FormError
					message={formError}
					actionLabel={conflictStudentCode ? 'Log in instead' : undefined}
					onaction={conflictStudentCode ? () => switchToStudentLogin(conflictStudentCode!) : undefined}
				/>
			{/if}

			<Button type="submit" loading={submitting} tone={role === 'instructor' ? 'instructor' : 'brand'} class="mt-2 w-full">
				{#if role === 'instructor'}
					Sign in
				{:else if studentMode === 'login'}
					Log in
				{:else}
					Sign up
				{/if}
			</Button>
		</form>
	</div>
</div>
