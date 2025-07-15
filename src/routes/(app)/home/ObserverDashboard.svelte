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
			}[]
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

	// Helper function to get disk usage color based on percentage
	function getDiskUsageColor(percentage: number): { badgeClass: string; progressClass: string } {
		if (percentage < 50) {
			return { badgeClass: 'badge-success', progressClass: 'bg-success' };
		} else if (percentage < 70) {
			return { badgeClass: 'badge-info', progressClass: 'bg-info' };
		} else if (percentage < 85) {
			return { badgeClass: 'badge-warning', progressClass: 'bg-warning' };
		} else if (percentage < 95) {
			return { badgeClass: 'badge-error', progressClass: 'bg-error' };
		} else {
			return { badgeClass: 'badge-error', progressClass: 'bg-error' };
		}
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

	function getDiskMetrics(
		observer: ObserverWithMetrics
	): Array<{ key: string; metric: any; mount: string }> {
		// Find all disk_used_percent metrics
		const diskMetrics = Object.keys(observer.metrics)
			.filter((key) => key.includes('disk_used_percent'))
			.flatMap((key) => {
				const metricSnapshots = observer.metrics[key];
				return metricSnapshots.map((snapshot) => ({
					key,
					metric: snapshot,
					mount: snapshot.labels?.mount || '/'
				}));
			});

		console.log(`getDiskMetrics for ${observer.name}:`, diskMetrics);
		return diskMetrics;
	}

	// Enhanced function to get disk metrics with total and used bytes
	function getEnhancedDiskMetrics(observer: ObserverWithMetrics): {
		mounts: Array<{
			mount: string;
			usedPercent?: number;
			calculatedPercent?: number;
			totalBytes?: number;
			usedBytes?: number;
			freeBytes?: number;
		}>;
		totals: {
			totalBytes: number;
			usedBytes: number;
			freeBytes: number;
			usedPercent: number;
		};
	} {
		const diskData = new Map<string, any>();

		// Process all disk-related metrics
		['disk_used_percent', 'disk_total_bytes', 'disk_used_bytes', 'disk_free_bytes'].forEach(
			(metricName) => {
				if (observer.metrics[metricName]) {
					observer.metrics[metricName].forEach((snapshot) => {
						const mount = snapshot.labels?.mount || '/';
						if (!diskData.has(mount)) {
							diskData.set(mount, { mount });
						}

						const diskInfo = diskData.get(mount);
						if (metricName === 'disk_used_percent') {
							diskInfo.usedPercent = snapshot.value;
						} else if (metricName === 'disk_total_bytes') {
							diskInfo.totalBytes = snapshot.value;
						} else if (metricName === 'disk_used_bytes') {
							diskInfo.usedBytes = snapshot.value;
						} else if (metricName === 'disk_free_bytes') {
							diskInfo.freeBytes = snapshot.value;
						}
					});
				}
			}
		);

		// Calculate accurate percentages and totals
		const mounts = Array.from(diskData.values());
		let totalBytes = 0;
		let totalUsedBytes = 0;
		let totalFreeBytes = 0;

		mounts.forEach((mount) => {
			// Calculate accurate percentage if we have both used and total bytes
			if (mount.usedBytes !== undefined && mount.totalBytes !== undefined && mount.totalBytes > 0) {
				mount.calculatedPercent = (mount.usedBytes / mount.totalBytes) * 100;
			}

			// Add to totals
			if (mount.totalBytes) totalBytes += mount.totalBytes;
			if (mount.usedBytes) totalUsedBytes += mount.usedBytes;
			if (mount.freeBytes) totalFreeBytes += mount.freeBytes;
		});

		const totals = {
			totalBytes,
			usedBytes: totalUsedBytes,
			freeBytes: totalFreeBytes,
			usedPercent: totalBytes > 0 ? (totalUsedBytes / totalBytes) * 100 : 0
		};

		const result = { mounts, totals };
		console.log(`getEnhancedDiskMetrics for ${observer.name}:`, result);
		return result;
	}

	// Helper function to get first metric value (for single-value metrics)
	function getFirstMetricValue(observer: ObserverWithMetrics, metricName: string): any | null {
		const metricSnapshots = observer.metrics[metricName];
		return metricSnapshots && metricSnapshots.length > 0 ? metricSnapshots[0] : null;
	}

	// Helper function to get enhanced network metrics
	function getEnhancedNetworkMetrics(observer: ObserverWithMetrics): {
		totalSent: number;
		totalReceived: number;
		interfaces: Array<{
			interface: string;
			sent?: number;
			received?: number;
		}>;
	} {
		const networkData = new Map<string, any>();
		let totalSent = 0;
		let totalReceived = 0;

		// Process network sent metrics
		if (observer.metrics['net_bytes_sent']) {
			observer.metrics['net_bytes_sent'].forEach((snapshot) => {
				const iface = snapshot.labels?.interface || 'unknown';
				if (!networkData.has(iface)) {
					networkData.set(iface, { interface: iface });
				}
				const ifaceData = networkData.get(iface);
				ifaceData.sent = snapshot.value;
				totalSent += snapshot.value;
			});
		}

		// Process network received metrics
		if (observer.metrics['net_bytes_recv']) {
			observer.metrics['net_bytes_recv'].forEach((snapshot) => {
				const iface = snapshot.labels?.interface || 'unknown';
				if (!networkData.has(iface)) {
					networkData.set(iface, { interface: iface });
				}
				const ifaceData = networkData.get(iface);
				ifaceData.received = snapshot.value;
				totalReceived += snapshot.value;
			});
		}

		return {
			totalSent,
			totalReceived,
			interfaces: Array.from(networkData.values())
		};
	}

	// Helper function to check if metric exists
	function hasMetric(observer: ObserverWithMetrics, metricName: string): boolean {
		return observer.metrics[metricName] && observer.metrics[metricName].length > 0;
	}

	async function fetchObservers() {
		loading = true;
		error = '';
		try {
			const res = await apiGet<ObserverWithMetrics[]>('/api/observer/dashboard');
			if (res.success) {
				observers = res.data;

				// Log detailed metrics structure for debugging
				console.log('=== Observer Dashboard Debug ===');
				observers.forEach((observer, index) => {
					console.log(`Observer ${index + 1}: ${observer.name}`);
					console.log('All metrics keys:', Object.keys(observer.metrics));

					// Log metric counts
					Object.keys(observer.metrics).forEach((metricName) => {
						const count = observer.metrics[metricName].length;
						console.log(`  ${metricName}: ${count} snapshot(s)`);
					});

					// Find all disk-related metrics
					const diskMetrics = Object.keys(observer.metrics).filter((key) => key.includes('disk_'));
					console.log('Disk metrics found:', diskMetrics);

					// Find all network-related metrics
					const networkMetrics = Object.keys(observer.metrics).filter((key) => key.includes('net_'));
					console.log('Network metrics found:', networkMetrics);

					// Log each network metric with its interface
					networkMetrics.forEach((netMetric) => {
						const metricSnapshots = observer.metrics[netMetric];
						console.log(`  ${netMetric} (${metricSnapshots.length} snapshots):`);
						metricSnapshots.forEach((snapshot, idx) => {
							console.log(`    [${idx}]:`, {
								value: snapshot.value,
								interface: snapshot.labels?.interface || 'unknown',
								labels: snapshot.labels
							});
						});
					});

					// Log each disk metric with its mount point
					diskMetrics.forEach((diskMetric) => {
						const metricSnapshots = observer.metrics[diskMetric];
						console.log(`  ${diskMetric} (${metricSnapshots.length} snapshots):`);
						metricSnapshots.forEach((snapshot, idx) => {
							console.log(`    [${idx}]:`, {
								value: snapshot.value,
								mount: snapshot.labels?.mount || 'unknown',
								labels: snapshot.labels
							});
						});
					});

					// Show enhanced disk metrics
					console.log('Enhanced disk metrics:', getEnhancedDiskMetrics(observer));

					// Show enhanced network metrics
					console.log('Enhanced network metrics:', getEnhancedNetworkMetrics(observer));

					console.log('---');
				});
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

<div class="max-w-full space-y-6 overflow-x-hidden">
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
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each observers as o}
				<div class="card bg-base-100 h-full min-w-0 shadow-xl">
					<div class="card-body flex h-full min-w-0 flex-col p-4">
						<!-- Header with name, type, and status -->
						<div class="mb-3 flex items-start justify-between">
							<div class="min-w-0 flex-1 pr-2">
								<h2 class="card-title mb-1 truncate text-base">{o.name}</h2>
								<div class="flex items-center gap-2 text-xs">
									<div class="tooltip tooltip-top" data-tip={getOnlineStatus(o.last_seen).tooltip}>
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
									<span class="text-base-content/60">•</span>
									<span class="text-base-content/70 truncate">
										{#if o.last_seen}
											{formatRelativeTime(o.last_seen)}
										{:else}
											Never
										{/if}
									</span>
								</div>
							</div>
							<div class="flex flex-shrink-0 flex-col items-end gap-1">
								<span class="badge badge-outline badge-xs">{o.type}</span>
								<span class="text-base-content/60 truncate font-mono text-xs">
									{formatUptime(o.last_uptime_seconds)}
								</span>
							</div>
						</div>

						<!-- Tags (if any) -->
						{#if Object.keys(o.tags).length > 0}
							<div class="mb-3 flex flex-wrap gap-1">
								{#each Object.entries(o.tags) as [k, v]}
									<span class="badge badge-xs badge-neutral">{k}={v}</span>
								{/each}
							</div>
						{/if}

						<!-- Metrics Grid -->
						<div class="mb-3 grid flex-1 grid-cols-2 gap-2">
							{#if hasMetric(o, 'cpu_usage')}
								<div class="bg-base-200 rounded-lg p-2">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">🔥</span>
										<span class="text-xs font-medium">CPU</span>
									</div>
									<div
										class="text-sm font-bold {getMetricColor('cpu_usage').replace(
											'badge-',
											'text-'
										)}"
									>
										{getFirstMetricValue(o, 'cpu_usage').value.toFixed(1)}%
									</div>
								</div>
							{:else}
								<div class="bg-base-200 rounded-lg p-2 opacity-50">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">🔥</span>
										<span class="text-xs font-medium">CPU</span>
									</div>
									<div class="text-base-content/50 text-sm font-bold">N/A</div>
								</div>
							{/if}

							{#if hasMetric(o, 'mem_used') && hasMetric(o, 'mem_total')}
								<div class="bg-base-200 rounded-lg p-2">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">💾</span>
										<span class="text-xs font-medium">Memory</span>
									</div>
									<div class="text-sm font-bold">
										{(
											(getFirstMetricValue(o, 'mem_used').value /
												getFirstMetricValue(o, 'mem_total').value) *
											100
										).toFixed(1)}%
									</div>
									<div class="text-base-content/60 text-xs">
										{formatMemory(getFirstMetricValue(o, 'mem_used').value)}
									</div>
								</div>
							{:else}
								<div class="bg-base-200 rounded-lg p-2 opacity-50">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">💾</span>
										<span class="text-xs font-medium">Memory</span>
									</div>
									<div class="text-base-content/50 text-sm font-bold">N/A</div>
									<div class="text-base-content/50 text-xs">-</div>
								</div>
							{/if}

							{#if hasMetric(o, 'temp_celsius')}
								<div class="bg-base-200 rounded-lg p-2">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">🌡️</span>
										<span class="text-xs font-medium">Temp</span>
									</div>
									<div class="text-accent text-sm font-bold">
										{getFirstMetricValue(o, 'temp_celsius').value.toFixed(1)}°C
									</div>
								</div>
							{:else}
								<div class="bg-base-200 rounded-lg p-2 opacity-50">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">🌡️</span>
										<span class="text-xs font-medium">Temp</span>
									</div>
									<div class="text-base-content/50 text-sm font-bold">N/A</div>
								</div>
							{/if}

							{#if hasMetric(o, 'net_bytes_sent')}
								{@const networkMetrics = getEnhancedNetworkMetrics(o)}
								<div class="bg-base-200 rounded-lg p-2">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">🌐</span>
										<span class="text-xs font-medium">Network</span>
									</div>
									<div class="text-xs">
										{#if networkMetrics.interfaces.length > 1}
											<!-- Multiple interfaces - show totals -->
											<div class="text-success">↑ {formatBytes(networkMetrics.totalSent)}</div>
											<div class="text-info">↓ {formatBytes(networkMetrics.totalReceived)}</div>
										{:else if networkMetrics.interfaces.length === 1}
											<!-- Single interface - show interface data -->
											{@const iface = networkMetrics.interfaces[0]}
											<div class="text-success">↑ {formatBytes(iface.sent || 0)}</div>
											<div class="text-info">↓ {formatBytes(iface.received || 0)}</div>
										{:else}
											<!-- Fallback to old method -->
											<div class="text-success">
												↑ {formatBytes(getFirstMetricValue(o, 'net_bytes_sent').value)}
											</div>
											{#if hasMetric(o, 'net_bytes_recv')}
												<div class="text-info">
													↓ {formatBytes(getFirstMetricValue(o, 'net_bytes_recv').value)}
												</div>
											{:else}
												<div class="text-base-content/50">↓ N/A</div>
											{/if}
										{/if}
									</div>
								</div>
							{:else}
								<div class="bg-base-200 rounded-lg p-2 opacity-50">
									<div class="mb-1 flex items-center gap-1">
										<span class="text-sm">🌐</span>
										<span class="text-xs font-medium">Network</span>
									</div>
									<div class="text-xs">
										<div class="text-base-content/50">↑ N/A</div>
										<div class="text-base-content/50">↓ N/A</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Disk Usage (simplified) -->
						<div class="mb-3">
							{#if getEnhancedDiskMetrics(o).mounts.length > 0}
								{@const enhancedDiskMetrics = getEnhancedDiskMetrics(o)}
								<div class="bg-base-200 rounded-lg p-2">
									<div class="mb-2 flex items-center gap-1">
										<span class="text-sm">💿</span>
										<span class="text-xs font-medium">Disk Usage</span>
									</div>

									<!-- Show only total if multiple mounts, otherwise show main mount -->
									{#if enhancedDiskMetrics.mounts.length > 1 && enhancedDiskMetrics.totals.totalBytes > 0}
										<div class="space-y-1">
											<div class="flex items-center justify-between">
												<span class="text-xs"
													>Total ({enhancedDiskMetrics.mounts.length} mounts)</span
												>
												<span
													class="text-xs font-bold {getDiskUsageColor(
														enhancedDiskMetrics.totals.usedPercent
													).badgeClass.replace('badge-', 'text-')}"
												>
													{enhancedDiskMetrics.totals.usedPercent.toFixed(1)}%
												</span>
											</div>
											<div class="bg-base-300 h-1.5 w-full rounded-full">
												<div
													class="{getDiskUsageColor(enhancedDiskMetrics.totals.usedPercent)
														.progressClass} h-1.5 rounded-full transition-all duration-300"
													style="width: {Math.min(enhancedDiskMetrics.totals.usedPercent, 100)}%"
												></div>
											</div>
											<div class="text-base-content/60 text-xs">
												{formatBytes(enhancedDiskMetrics.totals.usedBytes)} / {formatBytes(
													enhancedDiskMetrics.totals.totalBytes
												)}
											</div>
										</div>
									{:else if enhancedDiskMetrics.mounts.length === 1}
										{@const diskInfo = enhancedDiskMetrics.mounts[0]}
										{@const percentage = diskInfo.calculatedPercent || diskInfo.usedPercent || 0}
										<div class="space-y-1">
											<div class="flex items-center justify-between">
												<span class="font-mono text-xs">{diskInfo.mount}</span>
												<span
													class="text-xs font-bold {getDiskUsageColor(
														percentage
													).badgeClass.replace('badge-', 'text-')}"
												>
													{percentage.toFixed(1)}%
												</span>
											</div>
											<div class="bg-base-300 h-1.5 w-full rounded-full">
												<div
													class="{getDiskUsageColor(percentage)
														.progressClass} h-1.5 rounded-full transition-all duration-300"
													style="width: {Math.min(percentage, 100)}%"
												></div>
											</div>
											{#if diskInfo.totalBytes && diskInfo.usedBytes}
												<div class="text-base-content/60 text-xs">
													{formatBytes(diskInfo.usedBytes)} / {formatBytes(diskInfo.totalBytes)}
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{:else}
								<div class="bg-base-200 rounded-lg p-2 opacity-50">
									<div class="mb-2 flex items-center gap-1">
										<span class="text-sm">💿</span>
										<span class="text-xs font-medium">Disk Usage</span>
									</div>
									<div class="space-y-1">
										<div class="flex items-center justify-between">
											<span class="text-xs">N/A</span>
											<span class="text-base-content/50 text-xs font-bold">N/A</span>
										</div>
										<div class="bg-base-300 h-1.5 w-full rounded-full">
											<div class="bg-base-content/20 h-1.5 rounded-full" style="width: 0%"></div>
										</div>
										<div class="text-base-content/50 text-xs">No disk data</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- View Details Button -->
						<div class="mt-auto">
							<button class="btn btn-primary btn-sm w-full" on:click={() => goto(`/home/${o.id}`)}>
								View Details
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
