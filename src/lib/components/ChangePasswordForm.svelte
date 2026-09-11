<script lang="ts">
	import { ApiError } from '$lib/api/client';
	import { toasts } from '$lib/stores/toasts.svelte';
	import TextField from './TextField.svelte';
	import Button from './Button.svelte';

	interface Props {
		/** Role-specific wiring lives in the page - this component only owns the form/validation/error-display. */
		onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
		tone?: 'brand' | 'instructor';
	}

	let { onSubmit, tone = 'brand' }: Props = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let submitting = $state(false);
	let currentPasswordError = $state<string | null>(null);
	let newPasswordError = $state<string | null>(null);
	let justChanged = $state(false);

	function reset() {
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		currentPasswordError = null;
		newPasswordError = null;
		justChanged = false;

		if (!currentPassword) {
			currentPasswordError = 'Enter your current password.';
			return;
		}
		if (newPassword.length < 8) {
			newPasswordError = 'New password must be at least 8 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			newPasswordError = "New passwords don't match.";
			return;
		}

		submitting = true;
		try {
			await onSubmit(currentPassword, newPassword);
			justChanged = true;
			reset();
		} catch (err) {
			// bad_request here means "current password is incorrect" - a
			// field-level error under that input, not a generic toast.
			if (err instanceof ApiError && err.code === 'bad_request') {
				currentPasswordError = err.message;
			} else {
				toasts.error(err instanceof ApiError ? err.message : 'Could not change your password.');
			}
		} finally {
			submitting = false;
		}
	}
</script>

<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
	<TextField
		label="Current password"
		type="password"
		autocomplete="current-password"
		bind:value={currentPassword}
		error={currentPasswordError}
	/>
	<TextField
		label="New password"
		type="password"
		autocomplete="new-password"
		bind:value={newPassword}
		error={newPasswordError}
	/>
	<TextField
		label="Confirm new password"
		type="password"
		autocomplete="new-password"
		bind:value={confirmPassword}
	/>

	{#if justChanged}
		<p class="text-sm text-instructor-700">Password changed.</p>
	{/if}

	<div>
		<Button type="submit" {tone} loading={submitting} disabled={submitting}>Change password</Button>
	</div>
</form>
