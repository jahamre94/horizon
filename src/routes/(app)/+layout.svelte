<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Sidebar from '$lib/navigation/Sidebar.svelte';

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
		}
	});
</script>

<Sidebar>
	<main class="bg-base-100 min-h-screen flex-1 p-6">
		{@render children()}
	</main>
</Sidebar>
