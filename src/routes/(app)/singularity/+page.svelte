<script lang="ts">
	import { apiGet, apiPost } from '$lib/api/api';
	import Modal from '$lib/Modal.svelte';

	type Tenant = {
		id: string;
		slug: string;
		name: string;
		is_active: boolean;
		created_at: string;
		user_count: number;
	};

	let tenants: Tenant[] = [];
	let error = '';
	let showModal = false;
	let newTenantName = '';
	let newTenantSlug = '';

	async function loadTenants() {
		const res = await apiGet<Tenant[]>('/singularity/api/tenants');
		if (res.success) {
			tenants = res.data;
		} else {
			error = res.error;
		}
	}

	async function createTenant() {
		if (!newTenantName.trim()) return;
		const res = await apiPost<Tenant, { name: string; slug?: string }>('/singularity/api/tenant', {
			name: newTenantName.trim(),
			slug: newTenantSlug.trim() || undefined
		});

		if (res.success) {
			showModal = false;
			newTenantName = '';
			newTenantSlug = '';
			await loadTenants();
		} else {
			alert('Failed to create tenant: ' + res.error);
		}
	}

	loadTenants();
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base-content text-2xl font-bold">🌌 Singularity</h1>
			<p class="text-base-content/70 mt-1 text-sm">Global Admin Dashboard</p>
		</div>
		<button class="btn btn-primary gap-2" on:click={() => (showModal = true)}>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			New Tenant
		</button>
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
	{:else if tenants.length === 0}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body text-center">
				<div class="mb-4 text-6xl">🏢</div>
				<h2 class="card-title justify-center">No tenants found</h2>
				<p class="text-base-content/70">Get started by creating your first tenant</p>
				<div class="card-actions mt-4 justify-center">
					<button class="btn btn-primary" on:click={() => (showModal = true)}>
						Create First Tenant
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<div class="overflow-x-auto">
					<table class="table-zebra table w-full">
						<thead>
							<tr>
								<th>Name</th>
								<th>Slug</th>
								<th>Users</th>
								<th>Created</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each tenants as t}
								<tr>
									<td class="font-medium">{t.name}</td>
									<td><code class="bg-base-200 rounded px-2 py-1 text-sm">{t.slug}</code></td>
									<td>
										<span class="badge badge-outline">
											{t.user_count}
											{t.user_count === 1 ? 'user' : 'users'}
										</span>
									</td>
									<td class="text-base-content/70 text-sm"
										>{new Date(t.created_at).toLocaleString()}</td
									>
									<td>
										<span class="badge badge-sm {t.is_active ? 'badge-success' : 'badge-neutral'}">
											{t.is_active ? 'Active' : 'Inactive'}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>

<Modal bind:visible={showModal} header="Create New Tenant">
	<div class="space-y-4">
		<div class="form-control w-full">
			<label class="label" for="tenant-name">
				<span class="label-text text-white">Tenant Name</span>
			</label>
			<input
				id="tenant-name"
				class="input input-bordered bg-base-200 border-base-300 text-base-content w-full"
				bind:value={newTenantName}
				placeholder="Enter tenant name"
				type="text"
			/>
		</div>

		<div class="form-control w-full">
			<label class="label" for="tenant-slug">
				<span class="label-text text-white">Slug (optional)</span>
			</label>
			<input
				id="tenant-slug"
				class="input input-bordered bg-base-200 border-base-300 text-base-content w-full"
				bind:value={newTenantSlug}
				placeholder="auto-generated-from-name"
				type="text"
			/>
			<label class="label">
				<span class="label-text-alt text-white/70">Leave empty to auto-generate from name</span>
			</label>
		</div>
	</div>

	<div class="modal-action">
		<button class="btn btn-ghost" on:click={() => (showModal = false)}>Cancel</button>
		<button class="btn btn-primary" on:click={createTenant} disabled={!newTenantName.trim()}>
			Create Tenant
		</button>
	</div>
</Modal>
