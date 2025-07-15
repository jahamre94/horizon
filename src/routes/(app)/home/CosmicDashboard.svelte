<script lang="ts">
	import { onMount } from 'svelte';

	interface CosmicNode {
		id: string;
		name: string;
		type: 'star' | 'planet' | 'satellite' | 'station';
		status: 'active' | 'dormant' | 'critical';
		energy: number;
		connections: number;
		lastSync: string;
		coordinates: { x: number; y: number; z: number };
		data: {
			temperature: number;
			radiation: number;
			gravity: number;
			quantum_flux: number;
		};
	}

	let nodes: CosmicNode[] = [];
	let loading = false;
	let error = '';

	// Generate dummy cosmic data
	function generateCosmicData(): CosmicNode[] {
		const types: CosmicNode['type'][] = ['star', 'planet', 'satellite', 'station'];
		const statuses: CosmicNode['status'][] = ['active', 'dormant', 'critical'];
		const names = [
			'Proxima Centauri',
			'Kepler-442b',
			'Tau Ceti',
			'Gliese 667C',
			'Station Alpha',
			'Beacon Delta',
			'Nexus Prime',
			'Quantum Gate',
			'Deep Space Monitor',
			'Stellar Observatory'
		];

		return names.map((name, i) => ({
			id: `cosmic-${i}`,
			name,
			type: types[Math.floor(Math.random() * types.length)],
			status: statuses[Math.floor(Math.random() * statuses.length)],
			energy: Math.floor(Math.random() * 100),
			connections: Math.floor(Math.random() * 50),
			lastSync: new Date(Date.now() - Math.random() * 86400000).toISOString(),
			coordinates: {
				x: Math.floor(Math.random() * 1000) - 500,
				y: Math.floor(Math.random() * 1000) - 500,
				z: Math.floor(Math.random() * 1000) - 500
			},
			data: {
				temperature: Math.floor(Math.random() * 3000) - 273,
				radiation: Math.random() * 100,
				gravity: Math.random() * 10,
				quantum_flux: Math.random() * 1000
			}
		}));
	}

	function getTypeIcon(type: CosmicNode['type']): string {
		const icons = {
			star: '⭐',
			planet: '🪐',
			satellite: '🛰️',
			station: '🚀'
		};
		return icons[type];
	}

	function getStatusColor(status: CosmicNode['status']): string {
		const colors = {
			active: 'text-success',
			dormant: 'text-warning',
			critical: 'text-error'
		};
		return colors[status];
	}

	function getStatusBadge(status: CosmicNode['status']): string {
		const badges = {
			active: 'badge-success',
			dormant: 'badge-warning',
			critical: 'badge-error'
		};
		return badges[status];
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

	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	async function fetchCosmicData() {
		loading = true;
		error = '';
		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			nodes = generateCosmicData();
		} catch {
			error = 'Failed to fetch cosmic data';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await fetchCosmicData();
	});

	// Export refresh function so parent can call it
	export function refresh() {
		fetchCosmicData();
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

	{#if loading && nodes.length === 0}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if nodes.length === 0}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body text-center">
				<div class="mb-4 text-6xl">🌌</div>
				<h2 class="card-title justify-center">No cosmic nodes found</h2>
				<p class="text-base-content/70">Initialize your first cosmic network to start monitoring</p>
				<div class="card-actions mt-4 justify-center">
					<button class="btn btn-primary">Initialize Network</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Summary Stats -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<div class="card bg-gradient-to-r from-purple-500 to-pink-500 text-white">
				<div class="card-body">
					<div class="flex items-center gap-3">
						<div class="text-2xl">🌟</div>
						<div>
							<h3 class="text-lg font-bold">Total Nodes</h3>
							<p class="font-mono text-2xl">{nodes.length}</p>
						</div>
					</div>
				</div>
			</div>
			<div class="card bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
				<div class="card-body">
					<div class="flex items-center gap-3">
						<div class="text-2xl">⚡</div>
						<div>
							<h3 class="text-lg font-bold">Active Nodes</h3>
							<p class="font-mono text-2xl">{nodes.filter((n) => n.status === 'active').length}</p>
						</div>
					</div>
				</div>
			</div>
			<div class="card bg-gradient-to-r from-green-500 to-teal-500 text-white">
				<div class="card-body">
					<div class="flex items-center gap-3">
						<div class="text-2xl">🔗</div>
						<div>
							<h3 class="text-lg font-bold">Connections</h3>
							<p class="font-mono text-2xl">{nodes.reduce((sum, n) => sum + n.connections, 0)}</p>
						</div>
					</div>
				</div>
			</div>
			<div class="card bg-gradient-to-r from-orange-500 to-red-500 text-white">
				<div class="card-body">
					<div class="flex items-center gap-3">
						<div class="text-2xl">⚠️</div>
						<div>
							<h3 class="text-lg font-bold">Critical</h3>
							<p class="font-mono text-2xl">
								{nodes.filter((n) => n.status === 'critical').length}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Cosmic Nodes Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each nodes as node}
				<div class="card bg-base-100 border-base-300 border-2 shadow-xl">
					<div class="card-body">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-3">
									<span class="text-2xl">{getTypeIcon(node.type)}</span>
									<h2 class="card-title text-lg">{node.name}</h2>
								</div>
								<div class="flex items-center gap-4 text-xs">
									<div class="flex flex-col items-center">
										<div class="text-base-content/60 mb-1">Status</div>
										<div class="flex items-center gap-1">
											<div
												class="h-2 w-2 rounded-full {getStatusColor(node.status).replace(
													'text-',
													'bg-'
												)}"
											></div>
											<span class={getStatusColor(node.status)}>{node.status}</span>
										</div>
									</div>
									<div class="flex flex-col items-center">
										<div class="text-base-content/60 mb-1">Energy</div>
										<div class="font-mono text-sm">{node.energy}%</div>
									</div>
									<div class="flex flex-col items-center">
										<div class="text-base-content/60 mb-1">Last Sync</div>
										<div class="text-base-content/70">{formatRelativeTime(node.lastSync)}</div>
									</div>
								</div>
							</div>
							<div class="text-right">
								<span class="badge badge-outline badge-xs capitalize">{node.type}</span>
							</div>
						</div>

						<!-- Coordinates -->
						<div class="bg-base-200 mb-4 rounded-lg p-3">
							<div class="mb-2 flex items-center gap-2">
								<span class="text-lg">📍</span>
								<span class="text-sm font-medium">Coordinates</span>
							</div>
							<div class="grid grid-cols-3 gap-2 font-mono text-xs">
								<div class="text-center">
									<div class="text-base-content/60">X</div>
									<div>{node.coordinates.x}</div>
								</div>
								<div class="text-center">
									<div class="text-base-content/60">Y</div>
									<div>{node.coordinates.y}</div>
								</div>
								<div class="text-center">
									<div class="text-base-content/60">Z</div>
									<div>{node.coordinates.z}</div>
								</div>
							</div>
						</div>

						<!-- Cosmic Data -->
						<div class="space-y-3">
							<div class="text-base-content/80 text-sm font-medium">Cosmic Readings</div>

							<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
								<div class="flex items-center gap-2">
									<span class="text-lg">🌡️</span>
									<span class="text-sm font-medium">Temperature</span>
								</div>
								<span class="badge badge-info">
									{node.data.temperature}°K
								</span>
							</div>

							<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
								<div class="flex items-center gap-2">
									<span class="text-lg">☢️</span>
									<span class="text-sm font-medium">Radiation</span>
								</div>
								<span class="badge badge-warning">
									{node.data.radiation.toFixed(1)} μSv/h
								</span>
							</div>

							<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
								<div class="flex items-center gap-2">
									<span class="text-lg">🌍</span>
									<span class="text-sm font-medium">Gravity</span>
								</div>
								<span class="badge badge-success">
									{node.data.gravity.toFixed(2)} g
								</span>
							</div>

							<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
								<div class="flex items-center gap-2">
									<span class="text-lg">⚛️</span>
									<span class="text-sm font-medium">Quantum Flux</span>
								</div>
								<span class="badge badge-accent">
									{formatNumber(Math.floor(node.data.quantum_flux))} Hz
								</span>
							</div>

							<div class="bg-base-200 flex items-center justify-between rounded-lg p-3">
								<div class="flex items-center gap-2">
									<span class="text-lg">🔗</span>
									<span class="text-sm font-medium">Connections</span>
								</div>
								<span class="badge badge-secondary">
									{node.connections}
								</span>
							</div>
						</div>

						<!-- Actions -->
						<div class="card-actions mt-4 justify-between">
							<span class="badge {getStatusBadge(node.status)} badge-lg">
								{node.status.toUpperCase()}
							</span>
							<button class="btn btn-primary btn-sm"> Connect </button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
