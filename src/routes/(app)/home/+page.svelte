<script lang="ts">
	import ObserverDashboard from './ObserverDashboard.svelte';
	import CosmicDashboard from './CosmicDashboard.svelte';

	// Dashboard types
	type DashboardType = 'observer' | 'cosmic';

	// Set default dashboard
	let selectedDashboard: DashboardType = 'observer';
	let loading = false;

	// Dashboard configuration
	const dashboards = [
		{
			id: 'observer' as DashboardType,
			name: 'Observer',
			icon: '📊',
			description: 'Monitor system metrics and performance'
		},
		{
			id: 'cosmic' as DashboardType,
			name: 'Cosmic',
			icon: '🌌',
			description: 'Explore cosmic networks and quantum systems'
		}
	];

	// References to dashboard components
	let observerDashboard: ObserverDashboard;
	let cosmicDashboard: CosmicDashboard;

	function switchDashboard(dashboardType: DashboardType) {
		selectedDashboard = dashboardType;
	}

	function refreshCurrentDashboard() {
		loading = true;
		if (selectedDashboard === 'observer' && observerDashboard) {
			observerDashboard.refresh();
		} else if (selectedDashboard === 'cosmic' && cosmicDashboard) {
			cosmicDashboard.refresh();
		}
		// Reset loading state after a short delay
		setTimeout(() => {
			loading = false;
		}, 500);
	}

	// Get current dashboard info
	$: currentDashboard = dashboards.find((d) => d.id === selectedDashboard);
</script>

<div class="space-y-6">
	<!-- Header with Dashboard Switcher -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base-content flex items-center gap-2 text-2xl font-bold">
				<span>{currentDashboard?.icon}</span>
				{currentDashboard?.name} Dashboard
			</h1>
			<p class="text-base-content/70 mt-1 text-sm">{currentDashboard?.description}</p>
		</div>
		<div class="flex items-center gap-4">
			<!-- Dashboard Switcher -->
			<div class="tabs tabs-boxed">
				{#each dashboards as dashboard}
					<button
						class="tab {selectedDashboard === dashboard.id ? 'tab-active' : ''}"
						on:click={() => switchDashboard(dashboard.id)}
					>
						<span class="mr-2">{dashboard.icon}</span>
						{dashboard.name}
					</button>
				{/each}
			</div>

			<!-- Refresh Button -->
			<button class="btn btn-primary gap-2" on:click={refreshCurrentDashboard} disabled={loading}>
				{#if loading}
					<span class="loading loading-spinner"></span>
				{:else}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				{/if}
				Refresh
			</button>
		</div>
	</div>

	<!-- Dashboard Content -->
	{#if selectedDashboard === 'observer'}
		<ObserverDashboard bind:this={observerDashboard} />
	{:else if selectedDashboard === 'cosmic'}
		<CosmicDashboard bind:this={cosmicDashboard} />
	{/if}
</div>
