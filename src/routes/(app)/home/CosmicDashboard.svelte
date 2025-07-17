<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGet } from '$lib/api/api';
	import { selectedTenant } from '$lib/stores/auth';

	interface CosmicSystemSummary {
		total_observers: number;
		online_observers: number;
		offline_observers: number;
		total_memory_mb: number;
		total_disk_gb: number;
		total_disk_used_gb: number;
		total_net_sent: number;
		total_net_recv: number;
		avg_cpu_usage: number;
		avg_temp_celsius: number;
		avg_uptime_seconds: number;
		docker_containers_total: number;
		docker_containers_running: number;
		docker_containers_exited: number;
		docker_containers_created: number;
		qemu_vms_total: number;
		qemu_vms_running: number;
		qemu_vms_stopped: number;
		qemu_vms_paused: number;
		qemu_vms_suspended: number;
		qemu_vms_crashed: number;
		qemu_vms_pmsuspended: number;
		qemu_vms_unknown: number;
		qemu_total_vcpus: number;
		qemu_total_memory_mb: number;
		// GPU metrics
		gpu_count: number;
		gpu_total_memory_used_mb: number;
		gpu_total_memory_total_mb: number;
		gpu_total_power_draw_watts: number;
		gpu_average_temperature_celsius: number;
	}

	let summary: CosmicSystemSummary | null = null;
	let loading = false;
	let error = '';
	let initialized = false;

	// Re-fetch summary when tenant changes
	$: if ($selectedTenant && initialized) {
		fetchCosmicSummary();
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function formatMemory(mb: number): string {
		return formatBytes(mb * 1024 * 1024);
	}

	function formatDisk(gb: number): string {
		return formatBytes(gb * 1024 * 1024 * 1024);
	}

	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	function getSystemHealthColor(onlineObservers: number, totalObservers: number): string {
		const ratio = onlineObservers / totalObservers;
		if (ratio >= 0.8) return 'from-green-500 to-emerald-500';
		if (ratio >= 0.6) return 'from-yellow-500 to-orange-500';
		return 'from-red-500 to-rose-500';
	}

	function getSystemHealthStatus(onlineObservers: number, totalObservers: number): string {
		const ratio = onlineObservers / totalObservers;
		if (ratio >= 0.8) return 'Optimal';
		if (ratio >= 0.6) return 'Warning';
		return 'Critical';
	}

	function getCpuColor(usage: number): string {
		if (usage < 60) return 'badge-success';
		if (usage < 80) return 'badge-warning';
		return 'badge-error';
	}

	function getTempColor(temp: number): string {
		if (temp < 60) return 'badge-success';
		if (temp < 80) return 'badge-warning';
		return 'badge-error';
	}

	function getDiskUsagePercent(used: number, total: number): number {
		return (used / total) * 100;
	}

	function getDiskColor(usedPercent: number): string {
		if (usedPercent < 70) return 'badge-success';
		if (usedPercent < 85) return 'badge-warning';
		return 'badge-error';
	}

	function getDockerHealthColor(running: number, total: number): string {
		const ratio = running / total;
		if (ratio >= 0.8) return 'from-green-500 to-emerald-600';
		if (ratio >= 0.6) return 'from-yellow-500 to-orange-600';
		return 'from-red-500 to-rose-600';
	}

	function getDockerHealthStatus(running: number, total: number): string {
		const ratio = running / total;
		if (ratio >= 0.8) return 'Healthy';
		if (ratio >= 0.6) return 'Warning';
		return 'Critical';
	}

	function getQemuHealthColor(running: number, total: number): string {
		const ratio = running / total;
		if (ratio >= 0.8) return 'from-green-500 to-emerald-600';
		if (ratio >= 0.6) return 'from-yellow-500 to-orange-600';
		return 'from-red-500 to-rose-600';
	}

	function getQemuHealthStatus(running: number, total: number): string {
		const ratio = running / total;
		if (ratio >= 0.8) return 'Healthy';
		if (ratio >= 0.6) return 'Warning';
		return 'Critical';
	}

	function formatGpuMemory(mb: number): string {
		return formatBytes(mb * 1024 * 1024);
	}

	function getGpuTempColor(temp: number): string {
		if (temp < 70) return 'text-success';
		if (temp < 85) return 'text-warning';
		return 'text-error';
	}

	function getGpuTempBadgeColor(temp: number): string {
		if (temp < 70) return 'badge-success';
		if (temp < 85) return 'badge-warning';
		return 'badge-error';
	}

	function getGpuMemoryUsagePercent(used: number, total: number): number {
		return total > 0 ? (used / total) * 100 : 0;
	}

	function getGpuMemoryColor(usedPercent: number): string {
		if (usedPercent < 70) return 'badge-success';
		if (usedPercent < 85) return 'badge-warning';
		return 'badge-error';
	}

	async function fetchCosmicSummary() {
		loading = true;
		error = '';
		try {
			const res = await apiGet<CosmicSystemSummary>('/api/observer/summary');
			if (res.success) {
				summary = res.data;
			} else {
				error = res.error;
			}
		} catch {
			error = 'Failed to fetch cosmic system metrics';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		initialized = true;
		await fetchCosmicSummary();
	});

	// Export refresh function so parent can call it
	export function refresh() {
		fetchCosmicSummary();
	}
</script>

<div class="space-y-6">
	<!-- Floating Stars Background Animation -->
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
		<div class="absolute top-20 left-10 animate-pulse text-2xl opacity-30">⭐</div>
		<div
			class="absolute top-40 right-20 animate-bounce text-lg opacity-20"
			style="animation-delay: 1s;"
		>
			✨
		</div>
		<div
			class="absolute top-60 left-1/3 animate-pulse text-xl opacity-25"
			style="animation-delay: 2s;"
		>
			🌟
		</div>
		<div
			class="absolute right-1/4 bottom-40 animate-bounce text-lg opacity-20"
			style="animation-delay: 3s;"
		>
			⭐
		</div>
		<div
			class="absolute bottom-20 left-1/4 animate-pulse text-sm opacity-30"
			style="animation-delay: 4s;"
		>
			✨
		</div>
	</div>

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

	{#if loading && !summary}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if !summary}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body text-center">
				<div class="mb-4 text-6xl">🌌</div>
				<h2 class="card-title justify-center">No cosmic data available</h2>
				<p class="text-base-content/70">Observer network is not yet initialized</p>
				<div class="card-actions mt-4 justify-center">
					<button class="btn btn-primary" on:click={() => (window.location.href = '/agents')}>
						Deploy Observers
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- System Health Overview -->
		<div
			class="card bg-gradient-to-r {getSystemHealthColor(
				summary.online_observers,
				summary.total_observers
			)} text-white shadow-2xl"
		>
			<div class="card-body">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="animate-pulse text-4xl">�</div>
						<div>
							<h2 class="text-2xl font-bold">Cosmic System Status</h2>
							<p class="text-white/90">
								{getSystemHealthStatus(summary.online_observers, summary.total_observers)} •
								{summary.online_observers}/{summary.total_observers} observers online
							</p>
						</div>
					</div>
					<div class="text-right">
						<div class="text-3xl font-bold">
							{((summary.online_observers / summary.total_observers) * 100).toFixed(0)}%
						</div>
						<div class="text-sm text-white/80">Network Health</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Core Metrics Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
			<!-- Observer Network -->
			<div class="card bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div class="text-3xl">🛰️</div>
						<div class="text-right">
							<div class="text-2xl font-bold">{summary.total_observers}</div>
							<div class="text-sm opacity-80">Total Observers</div>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-2 text-sm">
						<div class="rounded bg-white/20 p-2 text-center">
							<div class="font-bold text-green-300">{summary.online_observers}</div>
							<div class="opacity-80">Online</div>
						</div>
						<div class="rounded bg-white/20 p-2 text-center">
							<div class="font-bold text-red-300">{summary.offline_observers}</div>
							<div class="opacity-80">Offline</div>
						</div>
					</div>
				</div>
			</div>

			<!-- System Performance -->
			<div class="card bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-xl">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div class="text-3xl">⚡</div>
						<div class="text-right">
							<div class="text-2xl font-bold">{summary.avg_cpu_usage.toFixed(1)}%</div>
							<div class="text-sm opacity-80">Avg CPU Usage</div>
						</div>
					</div>
					<div class="mt-4">
						<div class="mb-1 flex justify-between text-sm">
							<span>Performance</span>
							<span
								>{summary.avg_cpu_usage < 60
									? 'Optimal'
									: summary.avg_cpu_usage < 80
										? 'High'
										: 'Critical'}</span
							>
						</div>
						<div class="h-2 w-full rounded-full bg-white/20">
							<div
								class="h-2 rounded-full bg-white transition-all duration-300"
								style="width: {summary.avg_cpu_usage}%"
							></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Memory Systems -->
			<div class="card bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div class="text-3xl">💾</div>
						<div class="text-right">
							<div class="text-2xl font-bold">{formatMemory(summary.total_memory_mb)}</div>
							<div class="text-sm opacity-80">Total Memory</div>
						</div>
					</div>
					<div class="mt-4 text-sm">
						<div class="rounded bg-white/20 p-2 text-center">
							<div class="font-bold">System RAM</div>
							<div class="opacity-80">Across {summary.total_observers} nodes</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Thermal Status -->
			<div class="card bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-xl">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div class="text-3xl">🌡️</div>
						<div class="text-right">
							<div class="text-2xl font-bold">{summary.avg_temp_celsius.toFixed(1)}°C</div>
							<div class="text-sm opacity-80">Avg Temperature</div>
						</div>
					</div>
					<div class="mt-4">
						<div class="mb-1 flex justify-between text-sm">
							<span>Thermal State</span>
							<span
								>{summary.avg_temp_celsius < 60
									? 'Cool'
									: summary.avg_temp_celsius < 80
										? 'Warm'
										: 'Hot'}</span
							>
						</div>
						<div class="h-2 w-full rounded-full bg-white/20">
							<div
								class="h-2 rounded-full bg-white transition-all duration-300"
								style="width: {Math.min(summary.avg_temp_celsius, 100)}%"
							></div>
						</div>
					</div>
				</div>
			</div>

			<!-- QEMU Virtual Machines -->
			<div class="card bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div class="text-3xl">🖥️</div>
						<div class="text-right">
							<div class="text-2xl font-bold">{summary.qemu_vms_total}</div>
							<div class="text-sm opacity-80">Total VMs</div>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-2 text-xs">
						<div class="rounded bg-white/20 p-2 text-center">
							<div class="font-bold text-green-300">{summary.qemu_vms_running}</div>
							<div class="opacity-80">Running</div>
						</div>
						<div class="rounded bg-white/20 p-2 text-center">
							<div class="font-bold text-red-300">{summary.qemu_vms_stopped}</div>
							<div class="opacity-80">Stopped</div>
						</div>
					</div>
				</div>
			</div>

			<!-- GPU Systems -->
			{#if summary.gpu_count > 0}
				<div class="card bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
					<div class="card-body">
						<div class="flex items-center justify-between">
							<div class="text-3xl">🎮</div>
							<div class="text-right">
								<div class="text-2xl font-bold">{summary.gpu_count}</div>
								<div class="text-sm opacity-80">GPU{summary.gpu_count > 1 ? 's' : ''}</div>
							</div>
						</div>
						<div class="mt-4 grid grid-cols-2 gap-2 text-xs">
							<div class="rounded bg-white/20 p-2 text-center">
								<div class="font-bold text-green-300">
									{summary.gpu_total_memory_total_mb > 0
										? formatGpuMemory(summary.gpu_total_memory_used_mb)
										: 'N/A'}
								</div>
								<div class="opacity-80">Memory</div>
							</div>
							<div class="rounded bg-white/20 p-2 text-center">
								<div class="font-bold text-blue-300">
									{summary.gpu_average_temperature_celsius > 0
										? summary.gpu_average_temperature_celsius.toFixed(1) + '°C'
										: 'N/A'}
								</div>
								<div class="opacity-80">Temp</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Detailed Metrics -->
		<div class="space-y-6">
			<!-- Storage and Network Row -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Storage Systems -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<div class="mb-4 flex items-center gap-3">
							<div class="text-3xl">💿</div>
							<div>
								<h3 class="text-xl font-bold">Storage Systems</h3>
								<p class="text-base-content/70">Distributed storage across the cosmic network</p>
							</div>
						</div>

						<div class="space-y-4">
							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-3 flex items-center justify-between">
									<span class="text-sm font-medium">Total Capacity</span>
									<span class="text-lg font-bold whitespace-nowrap"
										>{formatDisk(summary.total_disk_gb)}</span
									>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">Used Space</span>
									<span
										class="badge {getDiskColor(
											getDiskUsagePercent(summary.total_disk_used_gb, summary.total_disk_gb)
										)} whitespace-nowrap"
									>
										{formatDisk(summary.total_disk_used_gb)}
									</span>
								</div>
							</div>

							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-3 flex items-center justify-between">
									<span class="text-sm font-medium">Usage</span>
									<span class="text-lg font-bold whitespace-nowrap"
										>{getDiskUsagePercent(
											summary.total_disk_used_gb,
											summary.total_disk_gb
										).toFixed(1)}%</span
									>
								</div>
								<div class="bg-base-300 h-3 w-full rounded-full">
									<div
										class="bg-primary h-3 rounded-full transition-all duration-300"
										style="width: {getDiskUsagePercent(
											summary.total_disk_used_gb,
											summary.total_disk_gb
										)}%"
									></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Network Traffic -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<div class="mb-4 flex items-center gap-3">
							<div class="text-3xl">🌐</div>
							<div>
								<h3 class="text-xl font-bold">Network Traffic</h3>
								<p class="text-base-content/70">Data flow across observer nodes</p>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Data Sent</span>
									<span class="text-lg font-bold">{formatBytes(summary.total_net_sent)}</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="text-xl">📤</div>
									<span class="badge badge-secondary">Outbound</span>
								</div>
							</div>

							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Data Received</span>
									<span class="text-lg font-bold">{formatBytes(summary.total_net_recv)}</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="text-xl">📥</div>
									<span class="badge badge-accent">Inbound</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Virtualization Row -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Docker Container Management -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<div class="mb-4 flex items-center gap-3">
							<div class="text-3xl">🐳</div>
							<div>
								<h3 class="text-xl font-bold">Container Orchestration</h3>
								<p class="text-base-content/70">Docker containers across the cosmic network</p>
							</div>
						</div>

						<div class="mb-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Container Health</span>
								<span class="text-lg font-bold">
									{getDockerHealthStatus(
										summary.docker_containers_running,
										summary.docker_containers_total
									)}
								</span>
							</div>
							<div class="bg-base-300 h-3 w-full rounded-full">
								<div
									class="h-3 rounded-full bg-gradient-to-r {getDockerHealthColor(
										summary.docker_containers_running,
										summary.docker_containers_total
									)} transition-all duration-300"
									style="width: {(summary.docker_containers_running /
										summary.docker_containers_total) *
										100}%"
								></div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Running</span>
									<span class="badge badge-success">{summary.docker_containers_running}</span>
								</div>
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Exited</span>
									<span class="badge badge-error">{summary.docker_containers_exited}</span>
								</div>
							</div>

							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Created</span>
									<span class="badge badge-info">{summary.docker_containers_created}</span>
								</div>
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Total</span>
									<span class="badge badge-neutral">{summary.docker_containers_total}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- QEMU Virtual Machine Management -->
				<div class="card bg-base-100 shadow-xl">
					<div class="card-body">
						<div class="mb-4 flex items-center gap-3">
							<div class="text-3xl">🖥️</div>
							<div>
								<h3 class="text-xl font-bold">Virtual Machines</h3>
								<p class="text-base-content/70">QEMU VMs across the cosmic network</p>
							</div>
						</div>

						<div class="mb-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">VM Health</span>
								<span class="text-lg font-bold">
									{getQemuHealthStatus(summary.qemu_vms_running, summary.qemu_vms_total)}
								</span>
							</div>
							<div class="bg-base-300 h-3 w-full rounded-full">
								<div
									class="h-3 rounded-full bg-gradient-to-r {getQemuHealthColor(
										summary.qemu_vms_running,
										summary.qemu_vms_total
									)} transition-all duration-300"
									style="width: {(summary.qemu_vms_running / summary.qemu_vms_total) * 100}%"
								></div>
							</div>
						</div>

						<div class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="bg-base-200 rounded-lg p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium">Running</span>
										<span class="badge badge-success">{summary.qemu_vms_running}</span>
									</div>
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium">Stopped</span>
										<span class="badge badge-error">{summary.qemu_vms_stopped}</span>
									</div>
								</div>

								<div class="bg-base-200 rounded-lg p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium">Paused</span>
										<span class="badge badge-warning">{summary.qemu_vms_paused}</span>
									</div>
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium">Suspended</span>
										<span class="badge badge-info">{summary.qemu_vms_suspended}</span>
									</div>
								</div>
							</div>

							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-medium">Total vCPUs</span>
									<span class="text-lg font-bold">{summary.qemu_total_vcpus}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">VM Memory</span>
									<span class="text-lg font-bold">{formatMemory(summary.qemu_total_memory_mb)}</span
									>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- GPU Systems -->
		{#if summary.gpu_count > 0}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="mb-4 flex items-center gap-3">
						<div class="text-3xl">🎮</div>
						<div>
							<h3 class="text-xl font-bold">GPU Systems</h3>
							<p class="text-base-content/70">
								Graphics processing units across the cosmic network
							</p>
						</div>
					</div>

					<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="bg-base-200 rounded-lg p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">GPU Count</span>
								<span class="text-lg font-bold">{summary.gpu_count}</span>
							</div>
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Power Draw</span>
								<span class="text-lg font-bold">
									{summary.gpu_total_power_draw_watts > 0
										? summary.gpu_total_power_draw_watts + 'W'
										: 'N/A'}
								</span>
							</div>
						</div>

						<div class="bg-base-200 rounded-lg p-4">
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium">Temperature</span>
								<span
									class="text-lg font-bold {summary.gpu_average_temperature_celsius > 0
										? getGpuTempColor(summary.gpu_average_temperature_celsius)
										: 'text-base-content/50'}"
								>
									{summary.gpu_average_temperature_celsius > 0
										? summary.gpu_average_temperature_celsius.toFixed(1) + '°C'
										: 'N/A'}
								</span>
							</div>
							{#if summary.gpu_average_temperature_celsius > 0}
								<div class="bg-base-300 h-2 w-full rounded-full">
									<div
										class="h-2 rounded-full transition-all duration-300 {summary.gpu_average_temperature_celsius <
										70
											? 'bg-success'
											: summary.gpu_average_temperature_celsius < 85
												? 'bg-warning'
												: 'bg-error'}"
										style="width: {Math.min(
											(summary.gpu_average_temperature_celsius / 100) * 100,
											100
										)}%"
									></div>
								</div>
							{/if}
						</div>
					</div>

					<div class="space-y-4">
						{#if summary.gpu_total_memory_total_mb > 0}
							<div class="bg-base-200 rounded-lg p-4">
								<div class="mb-3 flex items-center justify-between">
									<span class="text-sm font-medium">Memory Usage</span>
									<span class="text-lg font-bold">
										{getGpuMemoryUsagePercent(
											summary.gpu_total_memory_used_mb,
											summary.gpu_total_memory_total_mb
										).toFixed(1)}%
									</span>
								</div>
								<div class="bg-base-300 h-3 w-full rounded-full">
									<div
										class="h-3 rounded-full transition-all duration-300 {getGpuMemoryUsagePercent(
											summary.gpu_total_memory_used_mb,
											summary.gpu_total_memory_total_mb
										) < 70
											? 'bg-success'
											: getGpuMemoryUsagePercent(
														summary.gpu_total_memory_used_mb,
														summary.gpu_total_memory_total_mb
												  ) < 85
												? 'bg-warning'
												: 'bg-error'}"
										style="width: {getGpuMemoryUsagePercent(
											summary.gpu_total_memory_used_mb,
											summary.gpu_total_memory_total_mb
										)}%"
									></div>
								</div>
								<div class="mt-2 flex items-center justify-between text-sm">
									<span class="text-base-content/70"
										>Used: {formatGpuMemory(summary.gpu_total_memory_used_mb)}</span
									>
									<span class="text-base-content/70"
										>Total: {formatGpuMemory(summary.gpu_total_memory_total_mb)}</span
									>
								</div>
							</div>
						{:else}
							<div class="bg-base-200 rounded-lg p-4 text-center">
								<div class="text-base-content/50 text-sm">No GPU memory data available</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- System Uptime -->
		<div class="card bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl">
			<div class="card-body">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="animate-pulse text-4xl">⏰</div>
						<div>
							<h3 class="text-2xl font-bold">System Uptime</h3>
							<p class="text-white/90">Average operational time across all observers</p>
						</div>
					</div>
					<div class="text-right">
						<div class="font-mono text-3xl font-bold">
							{formatUptime(summary.avg_uptime_seconds)}
						</div>
						<div class="text-sm text-white/80">Continuous Operation</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
