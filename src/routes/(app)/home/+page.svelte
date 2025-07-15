<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGet } from '$lib/api/api';

	interface ObserverWithMetrics {
		id: string;
		name: string;
		type: string;
		tags: Record<string, any>;
		last_uptime_seconds: number;
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

	function formatUptime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getMetricColor(name: string): string {
		const map = {
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

	onMount(fetchObservers);
</script>

<div class="mx-auto max-w-7xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Observer Dashboard</h1>
		<button class="btn btn-primary" on:click={fetchObservers} disabled={loading}>
			{#if loading}
				<span class="loading loading-spinner"></span>
			{:else}
				🔄 Refresh
			{/if}
		</button>
	</div>

	{#if error}
		<div class="alert alert-error mb-6">{error}</div>
	{/if}

	{#if loading && observers.length === 0}
		<div class="flex h-64 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if observers.length === 0}
		<div class="text-base-content/70 py-12 text-center">No observers found</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each observers as o}
				<div class="card bg-base-200 shadow-lg">
					<div class="card-body">
						<div class="mb-3 flex justify-between">
							<div>
								<h2 class="card-title">{o.name}</h2>
								<div class="badge badge-outline mt-1">{o.type}</div>
							</div>
							<div class="text-right text-sm">
								<div class="text-base-content/70">Uptime</div>
								<div class="font-mono">{formatUptime(o.last_uptime_seconds)}</div>
							</div>
						</div>

						{#if Object.keys(o.tags).length > 0}
							<div class="mb-4 flex flex-wrap gap-1">
								{#each Object.entries(o.tags) as [k, v]}
									<span class="badge badge-sm badge-neutral">{k}={v}</span>
								{/each}
							</div>
						{/if}

						<div class="space-y-2 text-sm">
							{#if o.metrics.cpu_usage}
								<div class="flex justify-between">
									<span>🔥 CPU Usage</span>
									<span class="badge {getMetricColor('cpu_usage')}">
										{(o.metrics.cpu_usage.value * 100).toFixed(1)}%
									</span>
								</div>
							{/if}

							{#if o.metrics.mem_used && o.metrics.mem_total}
								<div>
									<div class="font-medium">💾 Memory</div>
									<div class="flex justify-between">
										<span>Used / Total</span>
										<span>
											{formatBytes(o.metrics.mem_used.value)} / {formatBytes(
												o.metrics.mem_total.value
											)} (
											{((o.metrics.mem_used.value / o.metrics.mem_total.value) * 100).toFixed(1)}%)
										</span>
									</div>
									{#if o.metrics.mem_free}
										<div class="flex justify-between">
											<span>Free</span>
											<span class="badge badge-success">
												{formatBytes(o.metrics.mem_free.value)}
											</span>
										</div>
									{/if}
								</div>
							{/if}

							{#if o.metrics.disk_used_percent}
								<div>
									<div class="font-medium">💿 Disk</div>
									<div class="flex justify-between">
										<span>{o.metrics.disk_used_percent.labels?.mount || '/'}</span>
										<span class="badge {getMetricColor('disk_used_percent')}">
											{o.metrics.disk_used_percent.value.toFixed(1)}%
										</span>
									</div>
								</div>
							{/if}

							{#if o.metrics.net_bytes_sent}
								<div>
									<div class="font-medium">🌐 Network</div>
									<div class="flex justify-between">
										<span>Sent</span>
										<span class="badge badge-secondary">
											{formatBytes(o.metrics.net_bytes_sent.value)}
										</span>
									</div>
									{#if o.metrics.net_bytes_recv}
										<div class="flex justify-between">
											<span>Recv</span>
											<span class="badge badge-secondary">
												{formatBytes(o.metrics.net_bytes_recv.value)}
											</span>
										</div>
									{/if}
								</div>
							{/if}

							{#if o.metrics.temp_celsius}
								<div class="flex justify-between">
									<span>🌡️ Temp</span>
									<span class="badge badge-accent">
										{o.metrics.temp_celsius.value.toFixed(1)}°C
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
