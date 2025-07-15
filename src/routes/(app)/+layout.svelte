<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Sidebar from '$lib/navigation/Sidebar.svelte';
	import { updateAuthStores } from '$lib/api/auth';

	let { children } = $props();

	function isLoggedIn(): boolean {
		const token = localStorage.getItem('access_token');
		if (!token) return false;

		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const now = Math.floor(Date.now() / 1000);
			return payload.exp > now;
		} catch {
			return false;
		}
	}

	onMount(() => {
		if (!isLoggedIn()) {
			goto('/login');
		} else {
			// Initialize auth stores from localStorage
			const payload = JSON.parse(localStorage.getItem('user_payload') || '{}');
			if (payload) {
				updateAuthStores(payload);
			}
		}
	});
</script>

<Sidebar>
	<main class="bg-base-200 min-h-screen flex-1 p-3 sm:p-6">
		{@render children()}
	</main>
</Sidebar>
