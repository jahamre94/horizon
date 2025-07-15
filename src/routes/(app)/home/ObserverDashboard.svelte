<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiGet } from '$lib/api/api';
	import { selectedTenant } from '$lib/stores/auth';

	interface ObserverWithMetrics {
		id: string;
		name: string;
		type: string;
		tags: Record<string, any>;
		last_uptime_seconds: number;
		last_seen?: string;
		metrics: Record<
			string,
			{
				time: string;
				value: number;
				metric_name: string;
				labels?: Record<string, any>;
			}
		>;
	}

	let observers: ObserverWithMetrics[] = [];
	let loading = false;
	let error = '';
	let initialized = false;

	// Re-fetch observers when tenant changes
	$: if ($selectedTenant && initialized) {
		fetchObservers();
	}

	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (days > 0) {
			// Format with days: "2d 14h 30m"
			return `${days}d ${hours}h ${minutes}m`;
		} else {
			// Format as HH:MM:SS for less than a day
			return `${hours.toString().padStart(2, '0')}:${minutes
				.toString()
				.padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
	}

	function formatRelativeTime(iso: string): string {
		const date = new Date(iso);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return `${seconds}s ago`;
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function formatMemory(bytes: number): string {
		// Debug: log the actual value
		console.log('Memory value:', bytes);

		if (bytes === 0) return '0 B';

		// The API appears to return memory values in KB, but they represent much larger values
		// Convert KB to bytes by multiplying by 1024, then by 1024 again to get the correct scale
		const actualBytes = bytes * 1024 * 1024; // Convert from KB to bytes at GB scale
		return formatBytes(actualBytes);
	}

	function getMetricColor(name: string): string {
		const map: Record<string, string> = {
			cpu_usage: 'badge-warning',
			mem_free: 'badge-success',
			mem_used: 'badge-info',
			disk_used_percent: 'badge-error',
			net_bytes_sent: 'badge-secondary',
			net_bytes_recv: 'badge-secondary',
			temp_celsius: 'badge-accent'
		};
		return map[name] || 'badge-neutral';
	}

	function getOnlineStatus(lastSeen?: string): { color: string; text: string; tooltip: string } {
		if (!lastSeen) {
			return {
				color: 'text-base-content/50',
				text: 'Unknown',
				tooltip: 'Observer has never been seen'
			};
		}

		const date = new Date(lastSeen);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffMinutes < 1) {
			return {
				color: 'text-success',
				text: 'Online',
				tooltip: 'Observer is online (last seen < 1 minute ago)'
			};
		} else if (diffMinutes < 5) {
			return {
				color: 'text-warning',
				text: 'Warning',
				tooltip: 'Observer connection is unstable (last seen 1-5 minutes ago)'
			};
		} else {
			return {
				color: 'text-error',
				text: 'Offline',
				tooltip: 'Observer is offline (last seen > 5 minutes ago)'
			};
		}
	}

	async function fetchObservers() {
		loading = true;
		error = '';
		try {
			const res = await apiGet<ObserverWithMetrics[]>('/api/observer/dashboard');
			if (res.success) {
				observers = res.data;
			} else {
				error = res.error;
			}
		} catch {
			error = 'Failed to fetch observers';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		initialized = true;
		await fetchObservers();
	});

	// Export refresh function so parent can call it
	export function refresh() {
		fetchObservers();
	}
</script>

<div class="space-y-6">
	{#if error}
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
	{/if}

	{#if loading && observers.length === 0}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if observers.length === 0}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body text-center">
				<div class="mb-4 text-6xl">📊</div>
				<h2 class="card-title justify-center">No observers found</h2>
				<p class="text-base-content/70">Deploy your first observer agent to start monitoring</p>
				<div class="card-actions mt-4 justify-center">
					<button class="btn btn-primary" on:click={() => goto('/agents')}> Add Observer </button>
				</div>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each observers as o}
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<h2 class="card-title mb-2 text-lg">{o.name}</h2>
								<div class="flex items-start gap-4 text-xs">
									<div class="flex flex-col items-center">
										<div class="text-base-content/60 mb-1">Status</div>
										<div
											class="tooltip tooltip-top"
											data-tip={getOnlineStatus(o.last_seen).tooltip}
										>
											<div class="flex items-center gap-1">
												<div
													class="h-2 w-2 rounded-full {getOnlineStatus(o.last_seen).color.replace(
														'text-',
														'bg-'
													)}"
												></div>
												<span class={getOnlineStatus(o.last_seen).color}>
													{getOnlineStatus(o.last_seen).text}
												</span>
											</div>
										</div>
									</div>
									<div class="flex flex-col items-center">
										<div class="text-base-content/60 mb-1">Last seen</div>
										<div class="text-base-content/70">
											{#if o.last_seen}
												{formatRelativeTime(o.last_seen)}
											{:else}
												Never
											{/if}
										</div>
									</div>
									<div class="flex flex-col items-center">
										<div class="text-base-content/60 mb-1">Uptime</div>
										<div class="text-base-content/70 font-mono">
											{formatUptime(o.last_uptime_seconds)}
										</div>
									</div>
								</div>
							</div>
							<div class="text-right">
								<span class="badge badge-outline badge-xs">{o.type}</span>
							</div>
						</div>

						{#if Object.keys(o.tags).length > 0}
							<div class="mb-4 flex flex-wrap gap-1.5">
								{#each Object.entries(o.tags) as [k, v]}
									<span class="badge badge-sm badge-neutral">{k}={v}</span>
								{/each}
							</div>
						{/if}

						<div class="space-y-3">
							<div class="text-base-content/80 text-sm font-medium">System Metrics</div>
							{#if o.metrics.cpu_usage}
								<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
									<div class="flex items-center gap-2">
										<span class="text-lg">🔥</span>
										<span class="text-sm font-medium">CPU Usage</span>
									</div>
									<span class="badge {getMetricColor('cpu_usage')}">
										{o.metrics.cpu_usage.value.toFixed(1)}%
									</span>
								</div>
							{/if}

							{#if o.metrics.mem_used && o.metrics.mem_total}
								<div class="bg-base-200 rounded-lg p-3">
									<div class="mb-2 flex items-center gap-2">
										<span class="text-lg">💾</span>
										<span class="text-sm font-medium">Memory</span>
									</div>
									<div class="space-y-2">
										<div class="flex justify-between text-sm">
											<span>Used / Total</span>
											<span class="font-mono">
												{formatMemory(o.metrics.mem_used.value)} / {formatMemory(
													o.metrics.mem_total.value
												)}
											</span>
										</div>
										<div class="flex justify-between text-sm">
											<span>Usage</span>
											<span class="font-mono">
												{((o.metrics.mem_used.value / o.metrics.mem_total.value) * 100).toFixed(1)}%
											</span>
										</div>
										{#if o.metrics.mem_free}
											<div class="flex justify-between text-sm">
												<span>Free</span>
												<span class="badge badge-success badge-sm">
													{formatMemory(o.metrics.mem_free.value)}
												</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}

							{#if o.metrics.disk_used_percent}
								<div class="bg-base-200 rounded-lg p-3">
									<div class="mb-2 flex items-center gap-2">
										<span class="text-lg">💿</span>
										<span class="text-sm font-medium">Disk Usage</span>
									</div>
									<div class="flex justify-between text-sm">
										<span>{o.metrics.disk_used_percent.labels?.mount || '/'}</span>
										<span class="badge {getMetricColor('disk_used_percent')}">
											{o.metrics.disk_used_percent.value.toFixed(1)}%
										</span>
									</div>
								</div>
							{/if}

							{#if o.metrics.net_bytes_sent}
								<div class="bg-base-200 rounded-lg p-3">
									<div class="mb-2 flex items-center gap-2">
										<span class="text-lg">🌐</span>
										<span class="text-sm font-medium">Network</span>
									</div>
									<div class="space-y-2">
										<div class="flex justify-between text-sm">
											<span>Sent</span>
											<span class="badge badge-secondary badge-sm">
												{formatBytes(o.metrics.net_bytes_sent.value)}
											</span>
										</div>
										{#if o.metrics.net_bytes_recv}
											<div class="flex justify-between text-sm">
												<span>Received</span>
												<span class="badge badge-secondary badge-sm">
													{formatBytes(o.metrics.net_bytes_recv.value)}
												</span>
											</div>
										{/if}
									</div>
								</div>
							{/if}

							{#if o.metrics.temp_celsius}
								<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
									<div class="flex items-center gap-2">
										<span class="text-lg">🌡️</span>
										<span class="text-sm font-medium">Temperature</span>
									</div>
									<span class="badge badge-accent">
										{o.metrics.temp_celsius.value.toFixed(1)}°C
									</span>
								</div>
							{/if}
						</div>

						<!-- View Details Button -->
						<div class="card-actions mt-4 justify-end">
							<button class="btn btn-primary btn-sm" on:click={() => goto(`/home/${o.id}`)}>
								View Details
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
