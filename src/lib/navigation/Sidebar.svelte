<script lang="ts">
	import { onMount } from 'svelte';
	import { isGlobalAdmin, tenantList } from '$lib/stores/auth';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

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

	function logout() {
		// Remove tokens and user data from localStorage
		localStorage.removeItem('user_payload');
		localStorage.removeItem('selected_tenant');
		localStorage.removeItem('access_token');
		localStorage.removeItem('refresh_token');

		// Clear stores
		tenantList.set([]);
		isGlobalAdmin.set(false);
		selectedTenant.set(null);

		// Navigate to login
		goto('/login');
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
		<aside class="bg-base-100 text-accent-content flex min-h-full w-64 flex-col shadow-2xl">
			<!-- Logo section - Horizon Portal -->
			<div class="border-accent-focus bg-base-100/90 border-b p-4">
				<div class="text-center">
					<h1 class="text-xl font-bold text-white">🌌 CosmosWatcher</h1>
					<p class="text-accent-content/70 mt-1 text-xs">Horizon Portal</p>
				</div>
			</div>

			<!-- Tenant selection - Observer Context -->
			<div class="border-accent-focus bg-base-100/95 border-b p-4">
				<p class="text-accent-content/70 mb-2 text-xs">Observer Context</p>
				<button
					class="btn btn-sm btn-outline btn-accent-content w-full text-left"
					on:click={() => (showTenantModal = true)}
				>
					{#if $selectedTenant}
						<div class="flex-1 text-left">
							<div class="font-medium">{$selectedTenant.name}</div>
							<div class="text-xs opacity-60">{$selectedTenant.slug}</div>
						</div>
					{:else}
						Select Observer
					{/if}
				</button>
			</div>

			<!-- Navigation - System Access -->
			<div class="flex-1 p-4">
				<p class="text-accent-content/70 mb-3 text-xs">System Access</p>
				<ul class="menu space-y-1 p-0">
					<li>
						<a href="/home" class="text-accent-content hover:bg-accent-focus rounded-md px-3 py-2">
							<span class="text-primary">●</span> Dashboard
						</a>
					</li>
					<li>
						<a
							href="/agents"
							class="text-accent-content hover:bg-accent-focus rounded-md px-3 py-2"
						>
							<span class="text-primary">●</span> Observers
						</a>
					</li>
					<li>
						<a
							href="/tenant-admin"
							class="text-accent-content hover:bg-accent-focus rounded-md px-3 py-2"
						>
							<span class="text-primary">●</span> Admin
						</a>
					</li>
					{#if $isGlobalAdmin}
						<li>
							<a
								href="/global-admin"
								class="text-accent-content hover:bg-accent-focus rounded-md px-3 py-2"
							>
								<span class="text-warning">●</span> Singularity
							</a>
						</li>
					{/if}
				</ul>
			</div>

			<!-- Logout button -->
			<div class="border-accent-focus border-t p-4">
				<button class="btn btn-outline btn-accent-content w-full" on:click={logout}>
					<span class="text-error">●</span> Logout
				</button>
			</div>
		</aside>
	</div>
</div>

<!-- Tenant Modal -->
{#if showTenantModal}
	<div class="modal modal-open">
		<div class="modal-box bg-base-100 border-base-300 border">
			<h3 class="text-primary mb-2 text-lg font-bold">Observer Selection</h3>
			<p class="text-base-content/70 mb-4 text-sm">Choose your observation context</p>
			<div class="space-y-2">
				{#each $tenantList as tenant}
					<button
						class="btn btn-outline bg-base-200 hover:bg-base-300 w-full justify-start text-left"
						on:click={() => switchTenant(tenant)}
						class:btn-primary={$selectedTenant?.id === tenant.id}
						class:bg-primary={$selectedTenant?.id === tenant.id}
						class:text-primary-content={$selectedTenant?.id === tenant.id}
					>
						<div>
							<div class="flex items-center gap-2 font-semibold">
								<span class="text-accent text-xs">●</span>
								{tenant.name}
							</div>
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
