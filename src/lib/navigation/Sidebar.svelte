<script lang="ts">
	import { onMount } from 'svelte';
	import { isGlobalAdmin, tenantList } from '$lib/stores/auth';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';

	export const selectedTenant = writable<{ id: string; name: string; slug: string } | null>(null);

	let showMobileNav = false;
	let showTenantModal = false;

	onMount(() => {
		if (!browser) return;
		const payloadStr = localStorage.getItem('user_payload');
		if (payloadStr) {
			try {
				const payload = JSON.parse(payloadStr);
				tenantList.set(payload.tenants);
				isGlobalAdmin.set(payload.is_global_admin);

				if (!localStorage.getItem('selected_tenant')) {
					const firstTenant = payload.tenants?.[0];
					if (firstTenant) {
						selectedTenant.set(firstTenant);
						localStorage.setItem('selected_tenant', JSON.stringify(firstTenant));
					}
				} else {
					selectedTenant.set(JSON.parse(localStorage.getItem('selected_tenant')));
				}
			} catch (e) {
				console.error('Failed to parse user payload or tenant');
			}
		}
	});

	function switchTenant(tenant) {
		selectedTenant.set(tenant);
		localStorage.setItem('selected_tenant', JSON.stringify(tenant));
		showTenantModal = false;
	}
</script>

<div class="drawer lg:drawer-open">
	<input id="drawer-toggle" type="checkbox" class="drawer-toggle" bind:checked={showMobileNav} />
	<div class="drawer-content flex flex-col">
		<!-- Mobile topbar (only visible on mobile) -->
		<div class="navbar bg-base-100 border-base-300 border-b px-4 shadow-md lg:hidden">
			<div class="flex-none">
				<label for="drawer-toggle" class="btn btn-square btn-ghost">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</label>
			</div>
			<div class="flex-1">
				<h1 class="text-primary text-lg font-bold">CosmosWatcher</h1>
			</div>
		</div>

		<!-- Main content -->
		<slot />
	</div>

	<div class="drawer-side">
		<label for="drawer-toggle" class="drawer-overlay"></label>
		<aside class="bg-primary text-primary-content flex min-h-full w-64 flex-col shadow-lg">
			<!-- Logo section -->
			<div class="border-primary-focus border-b p-4">
				<h1 class="text-xl font-bold text-white">CosmosWatcher</h1>
			</div>

			<!-- Tenant selection -->
			<div class="border-primary-focus border-b p-4">
				<button
					class="btn btn-sm btn-outline btn-primary-content w-full"
					on:click={() => (showTenantModal = true)}
				>
					{#if $selectedTenant}
						{$selectedTenant.name}
					{:else}
						Select Tenant
					{/if}
				</button>
			</div>

			<!-- Navigation -->
			<div class="flex-1 p-4">
				<h2 class="mb-4 text-lg font-semibold text-white">Navigation</h2>
				<ul class="menu p-0">
					<li>
						<a href="/home" class="text-primary-content hover:bg-primary-focus rounded">Dashboard</a
						>
					</li>
					<li>
						<a href="/agents" class="text-primary-content hover:bg-primary-focus rounded">Agents</a>
					</li>
					<li>
						<a href="/tenant-admin" class="text-primary-content hover:bg-primary-focus rounded"
							>Admin</a
						>
					</li>
					{#if $isGlobalAdmin}
						<li>
							<a href="/global-admin" class="text-primary-content hover:bg-primary-focus rounded"
								>Cosmos Admin</a
							>
						</li>
					{/if}
				</ul>
			</div>
		</aside>
	</div>
</div>

<!-- Tenant Modal -->
{#if showTenantModal}
	<div class="modal modal-open">
		<div class="modal-box bg-base-100">
			<h3 class="text-primary mb-4 text-lg font-bold">Select Tenant</h3>
			<div class="space-y-2">
				{#each $tenantList as tenant}
					<button
						class="btn btn-outline w-full justify-start text-left"
						on:click={() => switchTenant(tenant)}
						class:btn-primary={$selectedTenant?.id === tenant.id}
					>
						<div>
							<div class="font-semibold">{tenant.name}</div>
							<div class="text-sm opacity-70">{tenant.slug} • {tenant.role}</div>
						</div>
					</button>
				{/each}
			</div>
			<div class="modal-action">
				<button class="btn btn-outline" on:click={() => (showTenantModal = false)}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Optional: hide scrollbar for sidebar */
	aside::-webkit-scrollbar {
		display: none;
	}
</style>
