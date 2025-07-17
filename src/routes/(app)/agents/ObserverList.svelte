<script lang="ts">
	import { onMount } from 'svelte';
	import { apiGet, apiDelete } from '$lib/api/api';
	import { selectedTenant } from '$lib/stores/auth';
	import Modal from '$lib/Modal.svelte';

	type Observer = {
		id: string;
		name: string;
		type: string;
		tags: Record<string, any>;
		interval: number;
		last_seen?: string;
		last_uptime_seconds?: number;
	};

	let observers: Observer[] = [];
	let loading = true;
	let error: string | null = null;
	let deleting = false;
	let showDeleteModal = false;
	let observerToDelete: Observer | null = null;

	// Re-fetch observers when tenant changes
	let initialized = false;

	$: if ($selectedTenant && initialized) {
		fetchObservers();
	}

	onMount(async () => {
		initialized = true;
		await fetchObservers();
	});

	async function fetchObservers() {
		loading = true;
		error = null;

		try {
			const res = await apiGet<Observer[]>('/api/observer/list');
			if (res.success) {
				observers = res.data;
			} else {
				error = res.error || 'Failed to fetch observers';
			}
		} catch (err) {
			error = 'Network error occurred';
		} finally {
			loading = false;
		}
	}

	function formatInterval(seconds: number): string {
		if (seconds < 60) {
			return `Every ${seconds}s`;
		} else if (seconds < 3600) {
			return `Every ${Math.floor(seconds / 60)}m`;
		} else {
			return `Every ${Math.floor(seconds / 3600)}h`;
		}
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMinutes = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffSeconds < 60) {
			return `${diffSeconds}s ago`;
		} else if (diffMinutes < 60) {
			return `${diffMinutes}m ago`;
		} else if (diffHours < 24) {
			return `${diffHours}h ago`;
		} else {
			return `${diffDays}d ago`;
		}
	}

	function formatUptime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function formatTags(tags: Record<string, any>): string {
		return Object.entries(tags)
			.map(([key, value]) => `${key}=${value}`)
			.join(', ');
	}

	function getStatusColor(lastSeen?: string): string {
		if (!lastSeen) return 'text-base-content/50';

		const date = new Date(lastSeen);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffMinutes < 5) return 'text-success';
		if (diffMinutes < 15) return 'text-warning';
		return 'text-error';
	}

	function confirmDelete(observer: Observer) {
		observerToDelete = observer;
		showDeleteModal = true;
	}

	async function deleteObserver() {
		if (!observerToDelete) return;

		deleting = true;
		try {
			const res = await apiDelete<{ message: string }>(
				`/api/observer/${observerToDelete.id}/delete`
			);
			if (res.success) {
				// Remove the observer from the list
				observers = observers.filter((obs) => obs.id !== observerToDelete!.id);
				showDeleteModal = false;
				observerToDelete = null;
			} else {
				error = res.error || 'Failed to delete observer';
			}
		} catch (err) {
			error = 'Network error occurred while deleting observer';
		} finally {
			deleting = false;
		}
	}

	function cancelDelete() {
		showDeleteModal = false;
		observerToDelete = null;
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">Observers</h2>
		<button class="btn btn-ghost btn-sm" on:click={fetchObservers}>
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

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-md"></span>
		</div>
	{:else if error}
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
	{:else if !observers || observers.length === 0}
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
				/>
			</svg>
			<h3 class="text-base-content/70 mt-2 text-sm font-medium">No observers found</h3>
			<p class="text-base-content/50 mt-1 text-sm">
				Get started by adding your first observer agent.
			</p>
		</div>
	{:else}
		<!-- Desktop table view -->
		<div class="hidden md:block">
			<div class="overflow-x-auto">
				<table class="table-zebra table w-full">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Interval</th>
							<th>Tags</th>
							<th>Last Seen</th>
							<th>Uptime</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each observers as observer}
							<tr>
								<td class="font-medium">{observer.name}</td>
								<td>
									<span class="badge badge-outline capitalize">{observer.type}</span>
								</td>
								<td>{formatInterval(observer.interval)}</td>
								<td>
									{#if Object.keys(observer.tags).length > 0}
										<div class="flex flex-wrap gap-1.5">
											{#each Object.entries(observer.tags) as [key, value]}
												<span
													class="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
												>
													<span class="text-primary/80">{key}</span>
													<span class="text-primary/60">=</span>
													<span class="text-primary font-semibold">{value}</span>
												</span>
											{/each}
										</div>
									{:else}
										<span class="text-base-content/50">—</span>
									{/if}
								</td>
								<td class={getStatusColor(observer.last_seen)}>
									{observer.last_seen ? formatRelativeTime(observer.last_seen) : 'Never'}
								</td>
								<td>
									{observer.last_uptime_seconds !== undefined
										? formatUptime(observer.last_uptime_seconds)
										: '—'}
								</td>
								<td>
									<button
										class="btn btn-error btn-sm"
										on:click={() => confirmDelete(observer)}
										title="Delete observer"
										aria-label="Delete observer {observer.name}"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Mobile card view -->
		<div class="space-y-4 md:hidden">
			{#each observers as observer}
				<div class="card bg-base-100 border-base-200 border shadow-sm">
					<div class="card-body p-4">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold">{observer.name}</h3>
							<div class="flex items-center gap-2">
								<span class="badge badge-outline capitalize">{observer.type}</span>
								<button
									class="btn btn-error btn-sm btn-square"
									on:click={() => confirmDelete(observer)}
									title="Delete observer"
									aria-label="Delete observer {observer.name}"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						</div>

						<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
							<div>
								<span class="text-base-content/70">Interval:</span>
								<span class="ml-1">{formatInterval(observer.interval)}</span>
							</div>
							<div>
								<span class="text-base-content/70">Uptime:</span>
								<span class="ml-1">
									{observer.last_uptime_seconds !== undefined
										? formatUptime(observer.last_uptime_seconds)
										: '—'}
								</span>
							</div>
						</div>

						<div class="mt-2 text-sm">
							<span class="text-base-content/70">Last seen:</span>
							<span class="ml-1 {getStatusColor(observer.last_seen)}">
								{observer.last_seen ? formatRelativeTime(observer.last_seen) : 'Never'}
							</span>
						</div>

						{#if Object.keys(observer.tags).length > 0}
							<div class="mt-2">
								<span class="text-base-content/70 text-sm">Tags:</span>
								<div class="mt-1.5 flex flex-wrap gap-1.5">
									{#each Object.entries(observer.tags) as [key, value]}
										<span
											class="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
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
			{/each}
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:visible={showDeleteModal} header="Delete Observer">
	{#if observerToDelete}
		<div class="space-y-4">
			<div class="alert alert-warning">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<span>This action cannot be undone.</span>
			</div>

			<p class="text-base-content">
				Are you sure you want to delete the observer <strong>{observerToDelete.name}</strong>?
			</p>
			<p class="text-base-content/70 text-sm">
				This will permanently remove the observer and all its associated data including metrics,
				tokens, and bootstrap tokens.
			</p>

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
		</div>

		<div class="modal-action">
			<button class="btn btn-ghost" on:click={cancelDelete} disabled={deleting}> Cancel </button>
			<button class="btn btn-error" on:click={deleteObserver} disabled={deleting}>
				{#if deleting}
					<span class="loading loading-spinner loading-sm"></span>
				{/if}
				Delete Observer
			</button>
		</div>
	{/if}
</Modal>
