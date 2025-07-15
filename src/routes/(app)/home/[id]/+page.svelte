<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiGet } from '$lib/api/api';
	import { MetricChart } from '$lib';

	export let data;

	interface MetricSnapshot {
		time: string;
		value: number;
		metric_name: string;
		labels?: Record<string, any>;
	}

	interface Observer {
		id: string;
		name: string;
		type: string;
		tags: Record<string, any>;
		last_seen: string;
		last_uptime_seconds: number;
		metrics: Record<string, MetricSnapshot[]>;
	}

	let observer: Observer | null = data.observer;
	let metrics: Record<string, MetricSnapshot[]> = {};
	let selectedHours = 24;
	let loading = !observer; // Start loading if observer is null
	let error: string | null = null;

	// Initialize metrics if observer exists
	if (observer) {
		metrics = (observer as Observer).metrics;
	}

	// Initial load when observer is null
	onMount(() => {
		if (!observer && data.observerId) {
			fetchMetrics(selectedHours);
		}
	});

	const timeRanges = [
		{ value: 1, label: '1 hour' },
		{ value: 6, label: '6 hours' },
		{ value: 12, label: '12 hours' },
		{ value: 24, label: '24 hours' },
		{ value: 72, label: '3 days' },
		{ value: 168, label: '1 week' }
	];

	const metricConfigs: Record<string, { unit: string; color: string; title: string }> = {
		cpu_usage: { unit: '%', color: '#3b82f6', title: 'CPU Usage' },
		mem_used: { unit: 'MB', color: '#10b981', title: 'Memory Used' },
		mem_free: { unit: 'MB', color: '#06b6d4', title: 'Memory Free' },
		disk_used_percent: { unit: '%', color: '#f59e0b', title: 'Disk Usage' },
		net_bytes_sent: { unit: 'Bytes', color: '#ef4444', title: 'Network Sent' },
		net_bytes_recv: { unit: 'Bytes', color: '#8b5cf6', title: 'Network Received' },
		temp_celsius: { unit: '°C', color: '#f97316', title: 'Temperature' }
	};

	async function fetchMetrics(hours: number) {
		loading = true;
		error = null;
		try {
			const observerId = observer?.id || data.observerId;
			const result = await apiGet<Observer>(`/api/observer/${observerId}/history?range=${hours}h`);
			if (result.success) {
				observer = result.data;
				metrics = observer.metrics;
			} else {
				error = result.error || 'Failed to fetch metrics';
			}
		} catch (err) {
			error = 'Network error occurred';
		} finally {
			loading = false;
		}
	}

	function handleTimeRangeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedHours = parseInt(target.value);
		fetchMetrics(selectedHours);
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMinutes = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffSeconds < 60) return `${diffSeconds}s ago`;
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	}

	function formatUptime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes
			.toString()
			.padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function getStatusColor(lastSeen: string): string {
		const date = new Date(lastSeen);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffMinutes < 5) return 'text-success';
		if (diffMinutes < 15) return 'text-warning';
		return 'text-error';
	}

	function shortenId(id: string): string {
		return id.length > 8 ? id.substring(0, 8) + '...' : id;
	}

	$: availableMetrics = Object.keys(metrics).filter((key) => metrics[key]?.length > 0);
</script>

<svelte:head>
	<title>Observer: {observer?.name || 'Loading...'} - CosmosWatcher</title>
</svelte:head>

<div class="space-y-6">
	{#if loading && !observer}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
				/>
			</svg>
			<span>{error}</span>
		</div>
	{:else if observer}
		<!-- Header -->
		<div class="flex items-center justify-between">
			<nav class="breadcrumbs text-sm">
				<ul>
					<li><button class="link" on:click={() => goto('/home')}>Home</button></li>
					<li>Observer Details</li>
				</ul>
			</nav>

			<div class="flex items-center gap-3">
				<select
					class="select select-bordered select-sm"
					value={selectedHours}
					on:change={handleTimeRangeChange}
				>
					{#each timeRanges as range}
						<option value={range.value}>{range.label}</option>
					{/each}
				</select>

				<button class="btn btn-ghost btn-sm" on:click={() => fetchMetrics(selectedHours)}>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Refresh
				</button>
			</div>
		</div>

		<!-- Observer Info Card -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body">
				<div class="flex items-start justify-between">
					<div>
						<h1 class="text-2xl font-bold">{observer.name}</h1>
						<div class="text-base-content/70 mt-2 flex items-center gap-4 text-sm">
							<span class="badge badge-outline capitalize">{observer.type}</span>
							<span>ID: {shortenId(observer.id)}</span>
						</div>
					</div>

					<div class="text-right">
						<div class="text-base-content/70 text-sm">Status</div>
						<div class="font-medium {getStatusColor(observer.last_seen)}">
							{formatRelativeTime(observer.last_seen)}
						</div>
					</div>
				</div>

				<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Uptime -->
					<div class="stat">
						<div class="stat-title">Uptime</div>
						<div class="stat-value text-lg">
							{formatUptime(observer.last_uptime_seconds)}
						</div>
					</div>

					<!-- Last Seen -->
					<div class="stat">
						<div class="stat-title">Last Seen</div>
						<div class="stat-value text-lg {getStatusColor(observer.last_seen)}">
							{formatRelativeTime(observer.last_seen)}
						</div>
					</div>
				</div>

				<!-- Tags -->
				{#if Object.keys(observer.tags).length > 0}
					<div class="mt-4">
						<div class="mb-2 text-sm font-medium">Tags</div>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(observer.tags) as [key, value]}
								<span
									class="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium"
								>
									<span class="text-primary/80">{key}</span>
									<span class="text-primary/60">=</span>
									<span class="text-primary font-semibold">{value}</span>
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Loading State -->
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{/if}

		<!-- Error State -->
		{#if error}
			<div class="alert alert-error">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<span>{error}</span>
			</div>
		{/if}

		<!-- Metrics Charts -->
		{#if !loading && !error}
			{#if availableMetrics.length > 0}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{#each availableMetrics as metricName}
						{@const config = metricConfigs[metricName] || {
							unit: '',
							color: '#6b7280',
							title: metricName
						}}
						<MetricChart
							title={config.title}
							data={metrics[metricName]}
							unit={config.unit}
							color={config.color}
						/>
					{/each}
				</div>
			{:else}
				<div class="py-12 text-center">
					<svg
						class="text-base-content/30 mx-auto h-16 w-16"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
					<h3 class="text-base-content/70 mt-4 text-lg font-medium">No metrics available</h3>
					<p class="text-base-content/50 mt-2 text-sm">
						This observer hasn't reported any metrics in the selected time range.
					</p>
				</div>
			{/if}
		{/if}
	{/if}
</div>
