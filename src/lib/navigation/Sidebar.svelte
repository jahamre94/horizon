<script lang="ts">
	import { onMount } from 'svelte';
	import { isGlobalAdmin, tenantList } from '$lib/stores/auth';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Modal from '$lib/Modal.svelte';

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
					const storedTenant = localStorage.getItem('selected_tenant');
					if (storedTenant) {
						selectedTenant.set(JSON.parse(storedTenant));
					}
				}
			} catch (e) {
				console.error('Failed to parse user payload or tenant');
			}
		}
	});

	function switchTenant(tenant: { id: string; name: string; slug: string }) {
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
				<h1 class="text-primary-content text-lg font-bold">COSMOS WATCHER</h1>
			</div>
		</div>

		<!-- Main content -->
		<slot />
	</div>

	<div class="drawer-side">
		<label for="drawer-toggle" class="drawer-overlay"></label>
		<aside
			class="flex min-h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 shadow-2xl"
		>
			<!-- Logo section - Horizon Portal -->
			<!-- Logo section - Horizon Portal -->
			<div class="p-6 pb-4">
				<div class="flex items-center gap-3">
					<img src="/icon.png" alt="CosmosWatcher Logo" class="h-12 w-12" />
					<div>
						<h1 class="text-md font-bold text-nowrap text-white">Cosmos Watcher</h1>
						<p class="mt-1 text-xs font-medium text-slate-300">Horizon Portal</p>
					</div>
				</div>
			</div>
			<!-- Tenant selection - Observer Context -->
			<div class="px-6 pb-4">
				<p class="mb-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
					Observer Context
				</p>
				<button
					class="w-full rounded-lg border border-slate-600 bg-slate-800/50 p-3 text-left text-slate-100 transition-colors hover:bg-slate-700/50"
					on:click={() => (showTenantModal = true)}
				>
					{#if $selectedTenant}
						<div class="flex-1 text-left">
							<div class="font-medium">{$selectedTenant.name}</div>
							<div class="text-xs text-slate-400">{$selectedTenant.slug}</div>
						</div>
					{:else}
						<span class="text-slate-300">Select Observer</span>
					{/if}
				</button>
			</div>

			<!-- Navigation - System Access -->
			<div class="flex-1 px-6">
				<p class="mb-4 text-xs font-medium tracking-wide text-slate-400 uppercase">System Access</p>
				<nav class="space-y-2">
					<a
						href="/home"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
						<span class="text-blue-400">●</span>
						<span class="font-medium">Dashboard</span>
					</a>
					<a
						href="/agents"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
						<span class="text-blue-400">●</span>
						<span class="font-medium">Observers</span>
					</a>
					<a
						href="/tenant-admin"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
						<span class="text-blue-400">●</span>
						<span class="font-medium">Admin</span>
					</a>
					{#if $isGlobalAdmin}
						<a
							href="/singularity"
							class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
						>
							<span class="text-amber-400">●</span>
							<span class="font-medium">Singularity</span>
						</a>
					{/if}
				</nav>
			</div>

			<!-- Logout button -->
			<div class="p-6 pt-4">
				<button
					class="w-full rounded-lg border border-red-700/30 bg-red-900/20 p-3 text-red-300 transition-colors hover:bg-red-900/30 hover:text-red-200"
					on:click={logout}
				>
					<span class="flex items-center justify-center gap-2">
						<span class="text-red-400">●</span>
						<span class="font-medium">Logout</span>
					</span>
				</button>
			</div>
		</aside>
	</div>
</div>

<!-- Tenant Modal -->
<Modal visible={showTenantModal} header="Observer Selection">
	<p class="mb-6 text-sm text-slate-300">Choose your observation context</p>
	<div class="space-y-3">
		{#each $tenantList as tenant}
			<button
				class="w-full rounded-lg border border-slate-600 bg-slate-700/50 p-4 text-left text-slate-100 transition-colors hover:bg-slate-600/50"
				on:click={() => switchTenant(tenant)}
				class:bg-blue-600={$selectedTenant?.id === tenant.id}
				class:border-blue-500={$selectedTenant?.id === tenant.id}
				class:text-white={$selectedTenant?.id === tenant.id}
			>
				<div>
					<div class="flex items-center gap-2 font-semibold">
						<span class="text-xs text-blue-400">●</span>
						{tenant.name}
					</div>
					<div class="mt-1 text-sm text-slate-400">{tenant.slug} • {tenant.role}</div>
				</div>
			</button>
		{/each}
	</div>
	<div class="modal-action">
		<button
			class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700"
			on:click={() => (showTenantModal = false)}>Cancel</button
		>
	</div>
</Modal>

<style>
	/* Optional: hide scrollbar for sidebar */
	aside::-webkit-scrollbar {
		display: none;
	}
</style>
