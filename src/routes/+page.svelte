<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn } from '$lib/api/auth';

	onMount(() => {
		if (isLoggedIn()) {
			goto('/home');
		} else {
			goto('/login');
		}
	});
</script>

<!-- Optional fallback message -->
<p>Redirecting…</p>
