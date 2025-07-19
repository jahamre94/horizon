<script lang="ts">
	import { onMount } from 'svelte';
	import { isGlobalAdmin, tenantList, selectedTenant } from '$lib/stores/auth';
	import { selectedDashboard, type DashboardType } from '$lib/stores/dashboard';
	import { writable } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Modal from '$lib/Modal.svelte';
	import ChangePasswordModal from '$lib/ChangePasswordModal.svelte';

	let showMobileNav = false;
	let showTenantModal = false;
	let showChangePasswordModal = false;
	let showDashboardSubmenu = false;

	// Check if current page is the dashboard page
	$: isDashboardPage = $page.url.pathname === '/home';

	onMount(() => {
		if (!browser) return;

		// Initialize selected tenant from localStorage if not already set
		if (!localStorage.getItem('selected_tenant')) {
			const payloadStr = localStorage.getItem('user_payload');
			if (payloadStr) {
				try {
					const payload = JSON.parse(payloadStr);
					const firstTenant = payload.tenants?.[0];
					if (firstTenant) {
						selectedTenant.set(firstTenant);
						localStorage.setItem('selected_tenant', JSON.stringify(firstTenant));
					}
				} catch (e) {
					console.error('Failed to parse user payload');
				}
			}
		} else {
			const storedTenant = localStorage.getItem('selected_tenant');
			if (storedTenant) {
				try {
					selectedTenant.set(JSON.parse(storedTenant));
				} catch (e) {
					console.error('Failed to parse stored tenant');
				}
			}
		}
	});

	function switchTenant(tenant: { id: string; name: string; slug: string }) {
		selectedTenant.set(tenant);
		localStorage.setItem('selected_tenant', JSON.stringify(tenant));
		showTenantModal = false;
		showMobileNav = false; // Close mobile nav when switching tenant
	}

	function navigateAndCloseMobile(path: string) {
		goto(path);
		showMobileNav = false; // Close mobile nav when navigating
	}

	function navigateToDashboard(dashboardType: DashboardType) {
		selectedDashboard.set(dashboardType);
		goto('/home');
		showMobileNav = false; // Close mobile nav when navigating
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

<div class="drawer lg:drawer-open h-screen">
	<input id="drawer-toggle" type="checkbox" class="drawer-toggle" bind:checked={showMobileNav} />
	<div class="drawer-content flex h-full min-w-0 flex-col">
		<!-- Mobile topbar (only visible on mobile) -->
		<div class="navbar bg-base-100 border-base-300 flex-shrink-0 border-b px-4 shadow-md lg:hidden">
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
			<div class="min-w-0 flex-1">
				<h1 class="text-primary-content truncate text-lg font-bold">COSMOS WATCHER</h1>
			</div>
		</div>

		<!-- Main content -->
		<div class="flex-1 overflow-hidden">
			<slot />
		</div>
	</div>

	<div class="drawer-side">
		<label for="drawer-toggle" class="drawer-overlay"></label>
		<aside
			class="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 shadow-2xl"
		>
			<!-- Logo section - Horizon Portal -->
			<!-- Logo section - Horizon Portal -->
			<div class="p-6 pb-4">
				<div class="flex items-center gap-3">
					<img src="/icon.png" alt="CosmosWatcher Logo" class="h-12 w-12" />
					<div>
						<span
							class="from-primary to-accent group-hover:from-accent group-hover:to-primary bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300"
						>
							Cosmos Watcher
						</span>
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
					<!-- Dashboard with submenu -->
					<div class="relative">
						<button
							on:click={() =>
								isDashboardPage
									? (showDashboardSubmenu = !showDashboardSubmenu)
									: navigateAndCloseMobile('/home')}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white {isDashboardPage
								? 'bg-slate-700/30'
								: ''}"
						>
							<span class="text-blue-400">●</span>
							<span class="flex-1 font-medium">Dashboard</span>
							{#if isDashboardPage}
								<svg
									class="h-4 w-4 transition-transform {showDashboardSubmenu ? 'rotate-180' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							{/if}
						</button>

						{#if showDashboardSubmenu && isDashboardPage}
							<div class="mt-2 ml-6 space-y-1">
								<button
									on:click={() => navigateToDashboard('observer')}
									class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-white {$selectedDashboard ===
									'observer'
										? 'bg-slate-700/40 text-white'
										: ''}"
								>
									<span class="text-blue-400">📊</span>
									<span class="text-sm font-medium">Observer Dashboard</span>
								</button>
								<button
									on:click={() => navigateToDashboard('cosmic')}
									class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-white {$selectedDashboard ===
									'cosmic'
										? 'bg-slate-700/40 text-white'
										: ''}"
								>
									<span class="text-blue-400">🌌</span>
									<span class="text-sm font-medium">Cosmic Dashboard</span>
								</button>
							</div>
						{/if}
					</div>

					<button
						on:click={() => navigateAndCloseMobile('/agents')}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
						<span class="text-blue-400">●</span>
						<span class="font-medium">Observers</span>
					</button>
					<button
						on:click={() => navigateAndCloseMobile('/admin')}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
						<span class="text-blue-400">●</span>
						<span class="font-medium">Admin</span>
					</button>
					{#if $isGlobalAdmin}
						<button
							on:click={() => navigateAndCloseMobile('/singularity')}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-200 transition-colors hover:bg-slate-700/50 hover:text-white"
						>
							<span class="text-amber-400">●</span>
							<span class="font-medium">Singularity</span>
						</button>
					{/if}
				</nav>
			</div>

			<!-- Profile and Logout buttons -->
			<div class="space-y-3 p-6 pt-4">
				<!-- Profile/Change Password button -->
				<button
					class="w-full rounded-lg border border-slate-600 bg-slate-800/50 p-3 text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
					on:click={() => (showChangePasswordModal = true)}
				>
					<span class="flex items-center justify-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
						<span class="font-medium">Profile</span>
					</span>
				</button>

				<!-- Logout button -->
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

<!-- Change Password Modal -->
<ChangePasswordModal bind:visible={showChangePasswordModal} />

<style>
	/* Optional: hide scrollbar for sidebar */
	aside::-webkit-scrollbar {
		display: none;
	}
</style>
