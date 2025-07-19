<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiGet } from '$lib/api/api';
	import { MetricChart, VirtualMachinesList } from '$lib';

	export let data;

	interface MetricSnapshot {
		time: string;
		value: number;
		metric_name: string;
		labels?: Record<string, any>;
		interfaceName?: string;
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
	let userDetailsExpanded = false;
	let loadingUserDetails = false;
	let userDetails: any[] = [];
	let metricsLoading = false; // Separate loading state for metrics processing
	let showingPartialData = false; // Flag to indicate partial data is being shown

	// Initialize metrics if observer exists
	if (observer) {
		metrics = (observer as Observer).metrics;
		// Check if we have a large dataset
		const totalDataPoints = Object.values(metrics).reduce(
			(sum, arr) => sum + (arr?.length || 0),
			0
		);
		if (totalDataPoints > 1000) {
			showingPartialData = true;
			// Process data progressively in the next tick to not block rendering
			setTimeout(() => {
				showingPartialData = false;
			}, 100);
		}
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
		temp_celsius: { unit: '°C', color: '#f97316', title: 'Temperature' },
		qemu_vm_cpu_usage: { unit: '%', color: '#3b82f6', title: 'VM CPU Usage' },
		qemu_vm_memory_usage: { unit: '%', color: '#10b981', title: 'VM Memory Usage' },
		qemu_vm_disk_read_bytes: { unit: 'Bytes', color: '#06b6d4', title: 'VM Disk Read' },
		qemu_vm_disk_write_bytes: { unit: 'Bytes', color: '#f59e0b', title: 'VM Disk Write' },
		qemu_vm_network_rx_bytes: { unit: 'Bytes', color: '#8b5cf6', title: 'VM Network RX' },
		qemu_vm_network_tx_bytes: { unit: 'Bytes', color: '#ef4444', title: 'VM Network TX' },
		// GPU metrics
		gpu_count: { unit: '', color: '#22c55e', title: 'GPU Count' },
		gpu_memory_used_mb: { unit: 'MB', color: '#10b981', title: 'GPU Memory Used' },
		gpu_memory_total_mb: { unit: 'MB', color: '#06b6d4', title: 'GPU Memory Total' },
		gpu_power_draw_watts: { unit: 'W', color: '#f59e0b', title: 'GPU Power Draw' },
		gpu_temperature_celsius: { unit: '°C', color: '#f97316', title: 'GPU Temperature' }
	};

	async function fetchMetrics(hours: number) {
		loading = true;
		metricsLoading = true;
		error = null;
		showingPartialData = false;
		try {
			const observerId = observer?.id || data.observerId;
			const result = await apiGet<Observer>(`/api/observer/${observerId}/history?range=${hours}h`);
			if (result.success) {
				observer = result.data;
				// Check data size and show progressive loading if needed
				const totalDataPoints = Object.values(result.data.metrics).reduce(
					(sum, arr) => sum + (arr?.length || 0),
					0
				);
				if (totalDataPoints > 1000) {
					showingPartialData = true;
					// Show basic observer info first
					loading = false;
					// Process metrics in next tick to prevent blocking
					setTimeout(() => {
						metrics = observer!.metrics;
						showingPartialData = false;
						metricsLoading = false;
					}, 50);
				} else {
					metrics = observer.metrics;
					metricsLoading = false;
				}
			} else {
				error = result.error || 'Failed to fetch metrics';
				metricsLoading = false;
			}
		} catch (err) {
			error = 'Network error occurred';
			metricsLoading = false;
		} finally {
			if (!showingPartialData) {
				loading = false;
			}
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

	// Group network metrics by interface
	function groupNetworkMetrics(metricName: string): Record<string, MetricSnapshot[]> {
		const metricData = metrics[metricName];
		if (!metricData) {
			console.warn(`[groupNetworkMetrics] No data found for metric: ${metricName}`);
			return {};
		}

		const grouped: Record<string, MetricSnapshot[]> = {};

		metricData.forEach((snapshot, idx) => {
			const iface = snapshot.labels?.iface || 'unknown';

			if (!snapshot.labels || typeof snapshot.labels !== 'object') {
				console.warn(`[${metricName}][${idx}] Missing or invalid labels:`, snapshot.labels);
			} else if (!snapshot.labels.iface) {
				console.warn(`[${metricName}][${idx}] 'iface' label not found in labels:`, snapshot.labels);
			}

			if (!grouped[iface]) {
				grouped[iface] = [];
			}
			grouped[iface].push(snapshot);
		});

		console.log(
			`[groupNetworkMetrics] Grouped ${metricData.length} datapoints into ${Object.keys(grouped).length} interfaces`
		);
		return grouped;
	}

	// Create a combined dataset for all interfaces of a network metric
	function createNetworkMetricDataset(metricName: string): {
		data: MetricSnapshot[];
		interfaces: string[];
	} {
		const grouped = groupNetworkMetrics(metricName);
		const interfaces = Object.keys(grouped);
		const data: MetricSnapshot[] = [];

		interfaces.forEach((iface) => {
			grouped[iface].forEach((snapshot) => {
				data.push({
					...snapshot,
					// Add interface info to the snapshot for chart rendering
					interfaceName: iface
				});
			});
		});

		return { data, interfaces };
	}

	// Calculate network usage for a specific time period
	function calculateNetworkUsage(metricName: string, minutes: number): number {
		const metricData = metrics[metricName];
		if (!metricData || metricData.length === 0) {
			console.warn(`[${metricName}] No metric data available`);
			return 0;
		}

		const now = new Date();
		const cutoffTime = new Date(now.getTime() - minutes * 60 * 1000);
		console.log(
			`[${metricName}] Calculating usage over last ${minutes} minutes (cutoff: ${cutoffTime.toISOString()})`
		);

		const grouped = groupNetworkMetrics(metricName);
		const interfaces = Object.keys(grouped);
		console.log(`[${metricName}] Found ${interfaces.length} interfaces:`, interfaces);

		if (interfaces.length === 0) {
			console.warn(`[${metricName}] No interfaces found`);
			return 0;
		}

		let totalUsage = 0;

		for (const iface of interfaces) {
			const data = grouped[iface];
			if (!data || data.length === 0) {
				console.warn(`[${metricName}] No data for interface ${iface}`);
				continue;
			}

			// Sort snapshots by time ascending
			const sorted = [...data].sort(
				(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
			);

			// Find the earliest snapshot at or before cutoff
			const earliest = [...sorted]
				.reverse()
				.find((s) => new Date(s.time).getTime() <= cutoffTime.getTime());

			// Most recent snapshot
			const latest = sorted.at(-1);

			console.log(`[${metricName}] Interface: ${iface}`);
			console.log(`  Total points: ${sorted.length}`);
			console.log(`  Latest point: ${latest?.time} -> ${latest?.value}`);
			console.log(`  Earliest before cutoff: ${earliest?.time} -> ${earliest?.value}`);

			if (!earliest || !latest) {
				console.warn(`[${metricName}] Skipped interface ${iface}: Missing earliest or latest`);
				continue;
			}

			if (new Date(latest.time).getTime() <= new Date(earliest.time).getTime()) {
				console.warn(`[${metricName}] Skipped interface ${iface}: latest time <= earliest time`);
				continue;
			}

			const delta = latest.value - earliest.value;
			if (delta >= 0) {
				totalUsage += delta;
				console.log(`  Delta: ${delta}`);
			} else {
				console.warn(`  Negative delta (${delta}) for interface ${iface}, skipped`);
			}
		}

		console.log(`[${metricName}] Total usage over ${minutes}min: ${totalUsage}`);
		return totalUsage;
	}

	// Format bytes to human readable format
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	// User account functions
	function getUserAccountMetrics(metrics: Record<string, MetricSnapshot[]>): {
		total: number;
		loginable: number;
		non_loginable: number;
	} {
		// First try to use the direct metrics (same as ObserverDashboard)
		if (metrics.user_total && metrics.user_loginable && metrics.user_non_loginable) {
			return {
				total: metrics.user_total[0]?.value || 0,
				loginable: metrics.user_loginable[0]?.value || 0,
				non_loginable: metrics.user_non_loginable[0]?.value || 0
			};
		}

		// Fallback to counting from user_account array
		if (!metrics.user_account || metrics.user_account.length === 0) {
			return { total: 0, loginable: 0, non_loginable: 0 };
		}

		const users = metrics.user_account;
		const loginable = users.filter((u) => u.labels?.can_login === 'true').length;
		const non_loginable = users.filter((u) => u.labels?.can_login === 'false').length;

		return { total: users.length, loginable, non_loginable };
	}

	function getUserAccountHealthColor(loginable: number, total: number): string {
		if (total === 0) return 'from-gray-500 to-gray-600';
		const ratio = loginable / total;
		if (ratio < 0.3) return 'from-green-500 to-emerald-600';
		if (ratio < 0.6) return 'from-yellow-500 to-orange-600';
		return 'from-red-500 to-rose-600';
	}

	function getUserAccountHealthStatus(loginable: number, total: number): string {
		if (total === 0) return 'No Data';
		const ratio = loginable / total;
		if (ratio < 0.3) return 'Secure';
		if (ratio < 0.6) return 'Moderate';
		return 'Review';
	}

	async function toggleUserDetails() {
		userDetailsExpanded = !userDetailsExpanded;
		if (userDetailsExpanded && userDetails.length === 0) {
			await loadUserDetails();
		}
	}

	async function loadUserDetails() {
		if (!observer || !metrics.user_account) return;

		loadingUserDetails = true;
		try {
			// For individual observer, we already have the user data in metrics
			userDetails = metrics.user_account
				.map((userMetric) => {
					const labels = userMetric.labels || {};
					return {
						username: labels.username || 'Unknown',
						uid: labels.uid || 'N/A',
						shell: labels.shell || 'N/A',
						home: labels.home || 'N/A',
						can_login: labels.can_login || 'false',
						observer_id: observer!.id,
						observer_name: observer!.name
					};
				})
				.sort((a, b) => a.username.localeCompare(b.username));
		} catch (e) {
			console.error('Failed to load user details:', e);
		} finally {
			loadingUserDetails = false;
		}
	}

	// Reactive user filtering
	$: userAccountMetrics = getUserAccountMetrics(metrics);
	$: interactiveUsers = userDetails.filter((user) => user.can_login === 'true');
	$: systemUsers = userDetails.filter((user) => user.can_login === 'false');
	let networkSent5min = 0;
	let networkRecv5min = 0;
	let networkSent10min = 0;
	let networkRecv10min = 0;
	let networkSent15min = 0;
	let networkRecv15min = 0;

	// Reactive calculations for network usage
	$: if (metrics['net_bytes_sent']) {
		networkSent5min = calculateNetworkUsage('net_bytes_sent', 5);
		networkSent10min = calculateNetworkUsage('net_bytes_sent', 10);
		networkSent15min = calculateNetworkUsage('net_bytes_sent', 15);
	}

	$: if (metrics['net_bytes_recv']) {
		networkRecv5min = calculateNetworkUsage('net_bytes_recv', 5);
		networkRecv10min = calculateNetworkUsage('net_bytes_recv', 10);
		networkRecv15min = calculateNetworkUsage('net_bytes_recv', 15);
	}

	// Disk usage functions
	function groupDiskMetrics(): Record<string, MetricSnapshot[]> {
		const diskData = metrics['disk_used_percent'];
		if (!diskData || diskData.length === 0) return {};

		const grouped: Record<string, MetricSnapshot[]> = {};

		diskData.forEach((snapshot) => {
			const mount = snapshot.labels?.mount || 'unknown';
			if (!grouped[mount]) {
				grouped[mount] = [];
			}
			grouped[mount].push(snapshot);
		});

		return grouped;
	}

	function getCurrentDiskUsage(): Array<{ mount: string; usage: number; color: string }> {
		const grouped = groupDiskMetrics();
		const result: Array<{ mount: string; usage: number; color: string }> = [];

		Object.entries(grouped).forEach(([mount, snapshots]) => {
			if (snapshots.length > 0) {
				// Get the most recent snapshot
				const latest = snapshots.reduce((latest, current) =>
					new Date(current.time) > new Date(latest.time) ? current : latest
				);

				// Determine color based on usage
				let color = '#10b981'; // Green
				if (latest.value >= 85) {
					color = '#ef4444'; // Red
				} else if (latest.value >= 60) {
					color = '#f59e0b'; // Yellow
				}

				result.push({
					mount,
					usage: latest.value,
					color
				});
			}
		});

		// Sort by usage descending
		return result.sort((a, b) => b.usage - a.usage);
	}

	function createDiskTrendsDataset(): { data: MetricSnapshot[]; mounts: string[] } {
		const grouped = groupDiskMetrics();
		const mounts = Object.keys(grouped);
		const data: MetricSnapshot[] = [];

		mounts.forEach((mount) => {
			grouped[mount].forEach((snapshot) => {
				data.push({
					...snapshot,
					interfaceName: mount // Reuse interfaceName for groupBy
				});
			});
		});

		return { data, mounts };
	}

	// Reactive calculations for disk usage
	$: currentDiskUsage = metrics['disk_used_percent'] ? getCurrentDiskUsage() : [];
	$: diskTrendsData = metrics['disk_used_percent']
		? createDiskTrendsDataset()
		: { data: [], mounts: [] };
	$: visibleMounts = diskTrendsData.mounts.slice(0, 6); // Limit to 6 mounts for readability

	// Create a combined dataset for VM metrics grouped by VM name
	function createVMMetricDataset(metricName: string): {
		data: MetricSnapshot[];
		vmNames: string[];
	} {
		const metricData = metrics[metricName];
		if (!metricData) {
			console.warn(`[createVMMetricDataset] No data found for metric: ${metricName}`);
			return { data: [], vmNames: [] };
		}

		const grouped: Record<string, MetricSnapshot[]> = {};

		metricData.forEach((snapshot, idx) => {
			const vmName = snapshot.labels?.vm_name || 'unknown';

			if (!snapshot.labels || typeof snapshot.labels !== 'object') {
				console.warn(`[${metricName}][${idx}] Missing or invalid labels:`, snapshot.labels);
			} else if (!snapshot.labels.vm_name) {
				console.warn(
					`[${metricName}][${idx}] 'vm_name' label not found in labels:`,
					snapshot.labels
				);
			}

			if (!grouped[vmName]) {
				grouped[vmName] = [];
			}
			grouped[vmName].push(snapshot);
		});

		const vmNames = Object.keys(grouped);
		const data: MetricSnapshot[] = [];

		vmNames.forEach((vmName) => {
			grouped[vmName].forEach((snapshot) => {
				data.push({
					...snapshot,
					// Add VM name info to the snapshot for chart rendering
					interfaceName: vmName
				});
			});
		});

		console.log(
			`[createVMMetricDataset] Grouped ${metricData.length} datapoints into ${vmNames.length} VMs`
		);
		return { data, vmNames };
	}

	// Check if GPU metrics are available
	function hasGpuMetrics(metrics: Record<string, MetricSnapshot[]>): boolean {
		return Object.keys(metrics).some((key) => key.startsWith('gpu_'));
	}

	// Extract GPU information from labels
	function getGpuInfo(metrics: Record<string, MetricSnapshot[]>): {
		name: string;
		driverVersion: string;
		index: string;
		uuid: string;
	} | null {
		// Try to get GPU info from memory metrics first, then others
		const metricOrder = [
			'gpu_memory_used_mb',
			'gpu_memory_total_mb',
			'gpu_temperature_celsius',
			'gpu_power_draw_watts'
		];

		for (const metricName of metricOrder) {
			const metricData = metrics[metricName];
			if (metricData && metricData.length > 0) {
				const snapshot = metricData[0];
				if (snapshot.labels) {
					return {
						name: snapshot.labels.gpu_name || 'Unknown GPU',
						driverVersion: snapshot.labels.driver_version || 'Unknown',
						index: snapshot.labels.gpu_index || '0',
						uuid: snapshot.labels.gpu_uuid || 'Unknown'
					};
				}
			}
		}

		return null;
	}
</script>

<svelte:head>
	<title>Observer: {observer?.name || 'Loading...'} - CosmosWatcher</title>
</svelte:head>

<div class="space-y-6">
	<!-- Large Dataset Loading Info Banner -->
	{#if showingPartialData || metricsLoading}
		<div class="alert alert-info">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<div>
				<div class="font-semibold">Processing Large Dataset</div>
				<div class="text-sm">
					{#if showingPartialData}
						This observer has extensive metrics data. Basic information is shown while detailed
						charts are being prepared...
					{:else if metricsLoading}
						Loading and processing metrics data. This may take a moment for observers with extensive
						historical data.
					{/if}
				</div>
			</div>
			{#if metricsLoading}
				<span class="loading loading-spinner loading-sm"></span>
			{/if}
		</div>
	{/if}

	{#if loading && !observer}
		<div class="flex items-center justify-center py-8">
			<div class="text-center">
				<span class="loading loading-spinner loading-lg"></span>
				<div class="text-base-content/70 mt-4 text-sm">Loading observer data...</div>
			</div>
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
					disabled={loading || metricsLoading}
				>
					{#each timeRanges as range}
						<option value={range.value}>{range.label}</option>
					{/each}
				</select>

				<button
					class="btn btn-ghost btn-sm"
					on:click={() => fetchMetrics(selectedHours)}
					disabled={loading || metricsLoading}
				>
					{#if loading || metricsLoading}
						<span class="loading loading-spinner loading-sm"></span>
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
					{loading || metricsLoading ? 'Loading...' : 'Refresh'}
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

				<!-- Network Usage Stats -->
				{#if metricsLoading}
					<div class="mt-6">
						<div class="skeleton mb-4 h-4 w-48"></div>
						{#each Array(3) as _, i}
							<div class="mb-4">
								<div class="skeleton mb-2 h-3 w-24"></div>
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div class="skeleton h-16 w-full rounded-lg"></div>
									<div class="skeleton h-16 w-full rounded-lg"></div>
								</div>
							</div>
						{/each}
					</div>
				{:else if availableMetrics.includes('net_bytes_sent') || availableMetrics.includes('net_bytes_recv')}
					<div class="mt-6">
						<div class="mb-4 text-sm font-medium">Network Usage (All Interfaces)</div>

						<!-- 5 Minutes -->
						<div class="mb-4">
							<div class="text-base-content/70 mb-2 text-xs font-medium">Last 5 Minutes</div>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div class="stat rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
									<div class="stat-title text-xs">Sent</div>
									<div class="stat-value text-base text-red-600 dark:text-red-400">
										{formatBytes(networkSent5min)}
									</div>
								</div>
								<div class="stat rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
									<div class="stat-title text-xs">Received</div>
									<div class="stat-value text-base text-purple-600 dark:text-purple-400">
										{formatBytes(networkRecv5min)}
									</div>
								</div>
							</div>
						</div>

						<!-- 10 Minutes -->
						<div class="mb-4">
							<div class="text-base-content/70 mb-2 text-xs font-medium">Last 10 Minutes</div>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div class="stat rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
									<div class="stat-title text-xs">Sent</div>
									<div class="stat-value text-base text-red-600 dark:text-red-400">
										{formatBytes(networkSent10min)}
									</div>
								</div>
								<div class="stat rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
									<div class="stat-title text-xs">Received</div>
									<div class="stat-value text-base text-purple-600 dark:text-purple-400">
										{formatBytes(networkRecv10min)}
									</div>
								</div>
							</div>
						</div>

						<!-- 15 Minutes -->
						<div class="mb-4">
							<div class="text-base-content/70 mb-2 text-xs font-medium">Last 15 Minutes</div>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div class="stat rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
									<div class="stat-title text-xs">Sent</div>
									<div class="stat-value text-base text-red-600 dark:text-red-400">
										{formatBytes(networkSent15min)}
									</div>
								</div>
								<div class="stat rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
									<div class="stat-title text-xs">Received</div>
									<div class="stat-value text-base text-purple-600 dark:text-purple-400">
										{formatBytes(networkRecv15min)}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}

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

		<!-- Virtual Machines List -->
		{#if metricsLoading}
			<div class="card bg-base-100 border-base-200 border shadow-sm">
				<div class="card-body">
					<div class="mb-4 flex items-center justify-between">
						<div class="skeleton h-6 w-48"></div>
						<div class="skeleton h-6 w-24"></div>
					</div>
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="skeleton h-16 w-full"></div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<VirtualMachinesList {metrics} />
		{/if}

		<!-- Metrics Loading State -->
		{#if metricsLoading && !showingPartialData}
			<div class="flex items-center justify-center py-8">
				<div class="text-center">
					<span class="loading loading-spinner loading-lg"></span>
					<div class="text-base-content/70 mt-4 text-sm">Processing metrics data...</div>
				</div>
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

		<!-- Disk Usage Dashboard Tiles -->
		{#if metricsLoading}
			<!-- Skeleton for Disk Usage -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<div class="card bg-base-100 border-base-200 border shadow-sm">
					<div class="card-body">
						<div class="skeleton mb-4 h-6 w-48"></div>
						<div class="space-y-4">
							{#each Array(4) as _}
								<div class="flex items-center gap-3">
									<div class="flex-1">
										<div class="mb-2 flex items-center justify-between">
											<div class="skeleton h-4 w-24"></div>
											<div class="skeleton h-4 w-12"></div>
										</div>
										<div class="skeleton h-3 w-full rounded-full"></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
				<div class="card bg-base-100 border-base-200 border shadow-sm">
					<div class="card-body">
						<div class="skeleton mb-4 h-6 w-32"></div>
						<div class="skeleton h-80 w-full"></div>
					</div>
				</div>
			</div>
		{:else if availableMetrics.includes('disk_used_percent')}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Tile 1: Disk Usage Bar Chart (Current Snapshot) -->
				<div class="card bg-base-100 border-base-200 border shadow-sm">
					<div class="card-body">
						<h3 class="card-title text-lg">Disk Usage by Mount Point</h3>
						{#if currentDiskUsage.length > 0}
							<div class="space-y-4">
								{#each currentDiskUsage as disk}
									<div class="flex items-center gap-3">
										<div class="flex-1">
											<div class="mb-1 flex items-center justify-between text-sm">
												<span
													class="text-base-content max-w-xs truncate font-medium"
													title={disk.mount}
												>
													{disk.mount}
												</span>
												<span
													class="badge badge-outline text-base font-semibold"
													style="color: {disk.color}; border-color: {disk.color}"
												>
													{disk.usage.toFixed(1)}%
												</span>
											</div>
											<div class="bg-base-200 h-3 w-full rounded-full shadow-inner">
												<div
													class="h-3 rounded-full shadow-sm transition-all duration-500 ease-out"
													style="width: {disk.usage}%; background-color: {disk.color}"
												></div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="py-8 text-center">
								<svg
									class="text-base-content/30 mx-auto h-12 w-12"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
									></path>
								</svg>
								<div class="text-base-content/50 mt-2 text-sm">No disk usage data available</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Tile 2: Disk Usage Over Time -->
				<div class="card bg-base-100 border-base-200 border shadow-sm">
					<div class="card-body">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="card-title text-lg">Disk Usage Trends</h3>
							{#if diskTrendsData.mounts.length > 6}
								<select
									class="select select-sm select-bordered"
									on:change={(e) => {
										const target = e.target as HTMLSelectElement;
										const selectedCount = parseInt(target.value);
										visibleMounts = diskTrendsData.mounts.slice(0, selectedCount);
									}}
								>
									<option value="6">Show 6 mounts</option>
									<option value="12">Show 12 mounts</option>
									<option value={diskTrendsData.mounts.length}
										>Show all ({diskTrendsData.mounts.length})</option
									>
								</select>
							{/if}
						</div>

						{#if diskTrendsData.data.length > 0}
							<div class="h-80">
								<MetricChart
									title=""
									data={diskTrendsData.data.filter((d) =>
										visibleMounts.includes(d.interfaceName || 'unknown')
									)}
									unit="%"
									color="#f59e0b"
									groupBy="interfaceName"
								/>
							</div>
						{:else}
							<div class="py-8 text-center">
								<svg
									class="text-base-content/30 mx-auto h-12 w-12"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									></path>
								</svg>
								<div class="text-base-content/50 mt-2 text-sm">No disk usage trends available</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- GPU Metrics Dashboard -->
		{#if metricsLoading}
			<!-- Skeleton for GPU Metrics -->
			<div class="card bg-base-100 border-base-200 border shadow-sm">
				<div class="card-body">
					<div class="mb-4 flex items-center justify-between">
						<div class="skeleton h-6 w-32"></div>
						<div class="skeleton h-4 w-24"></div>
					</div>
					<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
						{#each Array(4) as _}
							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 text-center">
									<div class="skeleton mx-auto mb-2 h-8 w-8"></div>
									<div class="skeleton mx-auto h-6 w-16"></div>
									<div class="skeleton mx-auto mt-1 h-4 w-20"></div>
								</div>
							</div>
						{/each}
					</div>
					<div class="bg-base-200 rounded-lg p-4">
						<div class="skeleton mb-3 h-4 w-32"></div>
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each Array(4) as _}
								<div class="flex items-center justify-between">
									<div class="skeleton h-4 w-20"></div>
									<div class="skeleton h-4 w-24"></div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{:else if availableMetrics.some((metric) => metric.startsWith('gpu_'))}
			{@const gpuInfo = getGpuInfo(metrics)}
			<div class="card bg-base-100 border-base-200 border shadow-sm">
				<div class="card-body">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="card-title text-lg">
							{gpuInfo ? gpuInfo.name : 'GPU Metrics'}
						</h3>
						{#if gpuInfo}
							<div class="text-base-content/70 text-sm">
								Driver: {gpuInfo.driverVersion}
							</div>
						{/if}
					</div>

					{#if hasGpuMetrics(metrics)}
						<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
							{#if metrics.gpu_count && metrics.gpu_count.length > 0}
								<div class="bg-base-200 rounded-lg p-4 text-center">
									<div class="mb-2 text-2xl">🎮</div>
									<div class="text-lg font-bold">{metrics.gpu_count[0].value}</div>
									<div class="text-base-content/70 text-sm">GPU Count</div>
								</div>
							{/if}

							{#if metrics.gpu_memory_used_mb && metrics.gpu_memory_total_mb && metrics.gpu_memory_used_mb.length > 0 && metrics.gpu_memory_total_mb.length > 0}
								{@const memoryUsed = metrics.gpu_memory_used_mb[0].value}
								{@const memoryTotal = metrics.gpu_memory_total_mb[0].value}
								{@const memoryPercent = (memoryUsed / memoryTotal) * 100}
								<div class="bg-base-200 rounded-lg p-4">
									<div class="mb-2 text-center">
										<div class="text-lg font-bold">{memoryPercent.toFixed(1)}%</div>
										<div class="text-base-content/70 text-sm">Memory Usage</div>
									</div>
									<div class="bg-base-300 h-2 w-full rounded-full">
										<div
											class="h-2 rounded-full transition-all duration-300 {memoryPercent < 70
												? 'bg-success'
												: memoryPercent < 85
													? 'bg-warning'
													: 'bg-error'}"
											style="width: {memoryPercent}%"
										></div>
									</div>
									<div class="text-base-content/60 mt-1 text-center text-xs">
										{(memoryUsed / 1024).toFixed(1)} GB / {(memoryTotal / 1024).toFixed(1)} GB
									</div>
								</div>
							{/if}

							{#if metrics.gpu_power_draw_watts && metrics.gpu_power_draw_watts.length > 0}
								<div class="bg-base-200 rounded-lg p-4 text-center">
									<div class="mb-2 text-2xl">⚡</div>
									<div class="text-lg font-bold">{metrics.gpu_power_draw_watts[0].value}W</div>
									<div class="text-base-content/70 text-sm">Power Draw</div>
								</div>
							{/if}

							{#if metrics.gpu_temperature_celsius && metrics.gpu_temperature_celsius.length > 0}
								{@const temp = metrics.gpu_temperature_celsius[0].value}
								<div class="bg-base-200 rounded-lg p-4 text-center">
									<div class="mb-2 text-2xl">🌡️</div>
									<div
										class="text-lg font-bold {temp < 70
											? 'text-success'
											: temp < 85
												? 'text-warning'
												: 'text-error'}"
									>
										{temp.toFixed(1)}°C
									</div>
									<div class="text-base-content/70 text-sm">Temperature</div>
								</div>
							{/if}
						</div>

						{#if gpuInfo}
							<div class="bg-base-200 rounded-lg p-4">
								<h4 class="mb-3 text-sm font-medium">GPU Information</h4>
								<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
									<div class="flex items-center justify-between">
										<span class="text-base-content/70 text-sm">Model</span>
										<span class="text-sm font-medium">{gpuInfo.name}</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-base-content/70 text-sm">Driver Version</span>
										<span class="text-sm font-medium">{gpuInfo.driverVersion}</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-base-content/70 text-sm">GPU Index</span>
										<span class="text-sm font-medium">{gpuInfo.index}</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-base-content/70 text-sm">UUID</span>
										<span class="font-mono text-xs font-medium">{gpuInfo.uuid}</span>
									</div>
								</div>
							</div>
						{/if}
					{:else}
						<div class="py-8 text-center">
							<div class="mb-2 text-4xl">🎮</div>
							<div class="text-base-content/50 text-sm">No GPU detected</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- User Accounts Dashboard -->
		{#if metricsLoading}
			<!-- Skeleton for User Accounts -->
			<div class="card bg-base-100 border-base-200 border shadow-sm">
				<div class="card-body">
					<div class="skeleton mb-4 h-6 w-32"></div>
					<div class="mb-4">
						<div class="mb-2 flex items-center justify-between">
							<div class="skeleton h-4 w-24"></div>
							<div class="skeleton h-6 w-16"></div>
						</div>
						<div class="skeleton h-3 w-full rounded-full"></div>
						<div class="mt-2 flex items-center justify-between">
							<div class="skeleton h-3 w-20"></div>
							<div class="skeleton h-3 w-12"></div>
						</div>
					</div>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						{#each Array(3) as _}
							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 flex items-center justify-between">
									<div class="skeleton h-4 w-20"></div>
									<div class="skeleton h-6 w-8"></div>
								</div>
								<div class="flex items-center gap-2">
									<div class="skeleton h-6 w-6"></div>
									<div class="skeleton h-5 w-16"></div>
								</div>
							</div>
						{/each}
					</div>
					<div class="mt-4">
						<div class="skeleton h-8 w-full"></div>
					</div>
				</div>
			</div>
		{:else if userAccountMetrics.total > 0}
			<div class="card bg-base-100 border-base-200 border shadow-sm">
				<div class="card-body">
					<h3 class="card-title text-lg">User Accounts</h3>

					<div class="mb-4">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium">Account Security</span>
							<span class="text-lg font-bold">
								{getUserAccountHealthStatus(userAccountMetrics.loginable, userAccountMetrics.total)}
							</span>
						</div>
						<div class="bg-base-300 h-3 w-full rounded-full">
							<div
								class="h-3 rounded-full bg-gradient-to-r {getUserAccountHealthColor(
									userAccountMetrics.loginable,
									userAccountMetrics.total
								)} transition-all duration-300"
								style="width: {(userAccountMetrics.loginable / userAccountMetrics.total) * 100}%"
							></div>
						</div>
						<div class="mt-2 flex items-center justify-between text-sm">
							<span class="text-base-content/70">Interactive Users</span>
							<span class="text-base-content/70">
								{((userAccountMetrics.loginable / userAccountMetrics.total) * 100).toFixed(1)}%
							</span>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="bg-base-200 rounded-lg p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Total Users</span>
								<span class="text-lg font-bold">{userAccountMetrics.total}</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="text-xl">👥</div>
								<span class="badge badge-neutral">All Accounts</span>
							</div>
						</div>

						<div class="bg-base-200 rounded-lg p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Interactive</span>
								<span class="text-lg font-bold text-orange-600">{userAccountMetrics.loginable}</span
								>
							</div>
							<div class="flex items-center gap-2">
								<div class="text-xl">🔓</div>
								<span class="badge badge-warning">Login Capable</span>
							</div>
						</div>

						<div class="bg-base-200 rounded-lg p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">System</span>
								<span class="text-lg font-bold text-green-600"
									>{userAccountMetrics.non_loginable}</span
								>
							</div>
							<div class="flex items-center gap-2">
								<div class="text-xl">🔒</div>
								<span class="badge badge-success">Secure</span>
							</div>
						</div>
					</div>

					<!-- User Details Drilldown -->
					<div class="mt-4">
						<button
							class="btn btn-sm btn-outline w-full"
							on:click={toggleUserDetails}
							disabled={loadingUserDetails}
						>
							{#if loadingUserDetails}
								<span class="loading loading-spinner loading-sm"></span>
								Loading user details...
							{:else if userDetailsExpanded}
								<span class="text-sm">🔼</span>
								Hide User Details
							{:else}
								<span class="text-sm">🔽</span>
								Show User Details
							{/if}
						</button>

						{#if userDetailsExpanded}
							<div class="mt-4 space-y-4">
								<!-- User Table -->
								{#if userDetails.length > 0}
									<div class="overflow-x-auto">
										<table class="table-xs table">
											<thead>
												<tr>
													<th>Username</th>
													<th>UID</th>
													<th>Shell</th>
													<th>Home</th>
													<th>Login</th>
												</tr>
											</thead>
											<tbody>
												{#each userDetails as user}
													<tr class="hover">
														<td>
															<div class="flex items-center gap-2">
																<span class="text-sm">
																	{user.can_login === 'true' ? '🔓' : '🔒'}
																</span>
																<span class="font-mono text-sm">{user.username}</span>
															</div>
														</td>
														<td>
															<span class="font-mono text-sm">{user.uid}</span>
														</td>
														<td>
															<span
																class="font-mono text-xs {user.shell?.includes('nologin')
																	? 'text-success'
																	: 'text-warning'}"
															>
																{user.shell}
															</span>
														</td>
														<td>
															<span class="text-base-content/70 font-mono text-xs">
																{user.home}
															</span>
														</td>
														<td>
															<span
																class="badge badge-xs {user.can_login === 'true'
																	? 'badge-warning'
																	: 'badge-success'}"
															>
																{user.can_login === 'true' ? 'Interactive' : 'System'}
															</span>
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{:else}
									<div class="py-8 text-center">
										<div class="text-base-content/50">No user details available</div>
									</div>
								{/if}

								<!-- User Statistics -->
								<div class="bg-base-200 rounded-lg p-4">
									<h4 class="mb-3 font-semibold">User Statistics</h4>
									<div class="grid grid-cols-2 gap-4 text-sm">
										<div>
											<div class="text-base-content/70">Interactive Users</div>
											<div class="text-warning text-lg font-bold">{interactiveUsers.length}</div>
										</div>
										<div>
											<div class="text-base-content/70">System Users</div>
											<div class="text-success text-lg font-bold">{systemUsers.length}</div>
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Metrics Charts -->
		{#if metricsLoading}
			<!-- Skeleton Loading for Charts -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{#each Array(6) as _}
					<div class="card bg-base-100 border-base-200 border shadow-sm">
						<div class="card-body">
							<div class="mb-4 flex items-center justify-between">
								<div class="skeleton h-6 w-32"></div>
								<div class="skeleton h-4 w-16"></div>
							</div>
							<div class="skeleton h-64 w-full"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if !loading && !error}
			{#if availableMetrics.length > 0}
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{#each availableMetrics as metricName}
						{#if metricName !== 'disk_used_percent' && metricName !== 'qemu_vm_status'}
							{@const config = metricConfigs[metricName] || {
								unit: '',
								color: '#6b7280',
								title: metricName
							}}

							{#if metricName === 'net_bytes_sent' || metricName === 'net_bytes_recv'}
								{@const networkData = createNetworkMetricDataset(metricName)}
								{#if networkData.data.length > 0}
									<MetricChart
										title={config.title}
										data={networkData.data}
										unit={config.unit}
										color={config.color}
										groupBy="interfaceName"
									/>
								{/if}
							{:else if metricName.startsWith('qemu_vm_')}
								{@const vmData = createVMMetricDataset(metricName)}
								{#if vmData.data.length > 0}
									<MetricChart
										title={config.title}
										data={vmData.data}
										unit={config.unit}
										color={config.color}
										groupBy="interfaceName"
									/>
								{/if}
							{:else}
								<MetricChart
									title={config.title}
									data={metrics[metricName]}
									unit={config.unit}
									color={config.color}
								/>
							{/if}
						{/if}
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
