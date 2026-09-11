<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session.svelte';

	$effect(() => {
		if (session.current === null) {
			goto('/login');
		} else if (session.role === 'student') {
			goto('/student');
		} else {
			goto('/instructor');
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</div>
