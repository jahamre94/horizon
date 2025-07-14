<script lang="ts">
	import { apiGet } from '$lib/api/api';

	type Agent = {
		id: string;
		hostname: string;
		ip: string;
		// Add other Agent fields here
	};

	async function loadAgents() {
		const result = await apiGet<Agent[]>('/api/agents');
		if (result.success) {
			console.log('Loaded agents:', result.data);
		} else {
			console.error('Failed to load agents:', result.error);
		}
	}
</script>

<button on:click={loadAgents} class="btn btn-primary mt-4"> Load Agents </button>
