<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ObserverDashboard from './ObserverDashboard.svelte';
	import CosmicDashboard from './CosmicDashboard.svelte';
	import {
		selectedDashboard,
		autoRefreshInterval,
		autoRefreshEnabled,
		type DashboardType
	} from '$lib/stores/dashboard';

	let loading = false;
	let refreshInterval: NodeJS.Timeout | null = null;

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

	// Auto-refresh interval options
	const intervalOptions = [
		{ value: 10, label: '10 seconds' },
		{ value: 30, label: '30 seconds' },
		{ value: 60, label: '1 minute' },
		{ value: 120, label: '2 minutes' },
		{ value: 300, label: '5 minutes' },
		{ value: 600, label: '10 minutes' }
	];

	// References to dashboard components
	let observerDashboard: ObserverDashboard;
	let cosmicDashboard: CosmicDashboard;

	// Initialize stores on mount
	onMount(() => {
		selectedDashboard.init();
		autoRefreshInterval.init();
		autoRefreshEnabled.init();

		// Set up auto-refresh
		setupAutoRefresh();
	});

	// Clean up interval on destroy
	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	// Setup auto-refresh functionality
	function setupAutoRefresh() {
		// Clear existing interval
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}

		// Only setup if enabled
		if ($autoRefreshEnabled) {
			refreshInterval = setInterval(() => {
				refreshCurrentDashboard();
			}, $autoRefreshInterval * 1000);
		}
	}

	// Reactive setup when settings change
	$: {
		setupAutoRefresh();
	}

	function switchDashboard(dashboardType: DashboardType) {
		selectedDashboard.set(dashboardType);
	}

	function refreshCurrentDashboard() {
		loading = true;
		if ($selectedDashboard === 'observer' && observerDashboard) {
			observerDashboard.refresh();
		} else if ($selectedDashboard === 'cosmic' && cosmicDashboard) {
			cosmicDashboard.refresh();
		}
		// Reset loading state after a short delay
		setTimeout(() => {
			loading = false;
		}, 500);
	}

	function toggleAutoRefresh() {
		autoRefreshEnabled.set(!$autoRefreshEnabled);
	}

	function changeRefreshInterval(event: Event) {
		const target = event.target as HTMLSelectElement;
		const interval = parseInt(target.value);
		autoRefreshInterval.set(interval);
	}

	// Get current dashboard info
	$: currentDashboard = dashboards.find((d) => d.id === $selectedDashboard);
</script>

<div class="space-y-6">
	<!-- Header with Dashboard Switcher -->
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<h1 class="text-base-content flex items-center gap-2 text-2xl font-bold">
				<span>{currentDashboard?.icon}</span>
				{currentDashboard?.name} Dashboard
			</h1>
			<p class="text-base-content/70 mt-1 text-sm">{currentDashboard?.description}</p>
		</div>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
			<!-- Dashboard Switcher -->
			<div class="tabs tabs-boxed">
				{#each dashboards as dashboard}
					<button
						class="tab {$selectedDashboard === dashboard.id ? 'tab-active' : ''}"
						on:click={() => switchDashboard(dashboard.id)}
					>
						<span class="mr-2">{dashboard.icon}</span>
						{dashboard.name}
					</button>
				{/each}
			</div>

			<!-- Auto-refresh Controls -->
			<div class="flex items-center gap-2">
				<div class="form-control">
					<label class="label cursor-pointer gap-2">
						<span class="label-text text-sm">Auto-refresh</span>
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm"
							bind:checked={$autoRefreshEnabled}
							on:change={toggleAutoRefresh}
						/>
					</label>
				</div>
				{#if $autoRefreshEnabled}
					<select
						class="select select-bordered select-sm"
						bind:value={$autoRefreshInterval}
						on:change={changeRefreshInterval}
					>
						{#each intervalOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				{/if}
			</div>

			<!-- Manual Refresh Button -->
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
	{#if $selectedDashboard === 'observer'}
		<ObserverDashboard bind:this={observerDashboard} />
	{:else if $selectedDashboard === 'cosmic'}
		<CosmicDashboard bind:this={cosmicDashboard} />
	{/if}
</div>
