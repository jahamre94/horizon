<script lang="ts">
	import { selectedTenant } from '$lib/stores/auth';
	import { apiGet, apiPost } from '$lib/api/api';
	import { refreshTokens } from '$lib/api/auth';
	import { onDestroy } from 'svelte';
	import Modal from '$lib/Modal.svelte';
	import { browser } from '$app/environment';

	let tenantId = '';
	let tenantName = '';
	let unsubscribe = selectedTenant.subscribe((tenant) => {
		tenantId = tenant?.id || '';
		tenantName = tenant?.name || '';
	});

	onDestroy(unsubscribe);

	// Reactively load users when tenantId changes
	$: if (tenantId) {
		loadUsers();
	}

	type UserInTenant = {
		id: string;
		email: string;
		role: string;
		joined_at: string;
		first_name?: string;
		last_name?: string;
	};
	type InviteUserResponse = {
		created: boolean;
		temp_password?: string;
	};

	let users: UserInTenant[] = [];
	let error = '';
	let showModal = false;
	let firstName = '';
	let lastName = '';
	let email = '';
	let userType = 'user';
	let inviteResponse: InviteUserResponse | null = null;

	let showCreateTenantModal = false;
	let newTenantName = '';
	let createTenantError = '';

	// Auto-open the tenant modal if no tenant is selected
	$: if (browser && !$selectedTenant) {
		showCreateTenantModal = true;
	}

	async function loadUsers() {
		if (!tenantId) return;
		const res = await apiGet<UserInTenant[]>('/api/tenant/users');
		if (res.success) {
			users = res.data;
		} else {
			error = res.error;
		}
	}

	async function inviteUser() {
		if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
		const res = await apiPost<
			InviteUserResponse,
			{ first_name: string; last_name: string; email: string; role: string }
		>('/api/tenant/user', {
			first_name: firstName.trim(),
			last_name: lastName.trim(),
			email: email.trim(),
			role: userType
		});

		if (res.success) {
			inviteResponse = res.data;
			firstName = '';
			lastName = '';
			email = '';
			userType = 'user';
			await loadUsers();
		} else {
			alert('Failed to invite user: ' + res.error);
		}
	}

	function resetModal() {
		showModal = false;
		firstName = '';
		lastName = '';
		email = '';
		userType = 'user';
		inviteResponse = null;
	}

	async function createTenant() {
		createTenantError = '';
		const res = await apiPost('/api/tenant', { name: newTenantName });
		if (res.success) {
			const newTenantData = res.data;
			console.log('New tenant created:', newTenantData);

			// Extract only the fields needed for the selectedTenant store
			const newTenant = {
				id: newTenantData.id,
				name: newTenantData.name,
				slug: newTenantData.slug
			};

			selectedTenant.set(newTenant);
			localStorage.setItem('selected_tenant', JSON.stringify(newTenant));
			showCreateTenantModal = false;

			// Refresh the token since tenant creation updates the token payload
			await refreshTokens();

			// refresh page , hard reload
			window.location.reload();
		} else {
			createTenantError = res.error || 'Failed to create tenant.';
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base-content text-2xl font-bold">Users in Tenant: {tenantName}</h1>
			<p class="text-base-content/70 mt-1 text-sm">Manage tenant users and permissions</p>
		</div>
		<button class="btn btn-primary gap-2" on:click={() => (showModal = true)}>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Invite User
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
			<span>Error loading users: {error}</span>
		</div>
	{:else if users.length === 0}
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body text-center">
				<div class="mb-4 text-6xl">👥</div>
				<h2 class="card-title justify-center">No users found</h2>
				<p class="text-base-content/70">Get started by inviting your first user</p>
				<div class="card-actions mt-4 justify-center">
					<button class="btn btn-primary" on:click={() => (showModal = true)}>
						Invite First User
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
								<th>Email</th>
								<th>Role</th>
								<th>Joined At</th>
							</tr>
						</thead>
						<tbody>
							{#each users as user}
								<tr>
									<td>
										{#if user.first_name || user.last_name}
											{(user.first_name || '').trim()} {(user.last_name || '').trim()}
										{:else}
											<span class="text-base-content/50 italic">No name</span>
										{/if}
									</td>
									<td>{user.email}</td>
									<td>
										<span
											class="badge badge-outline badge-sm {user.role === 'admin'
												? 'badge-success'
												: 'badge-neutral'}"
										>
											{user.role}
										</span>
									</td>
									<td class="text-base-content/70 text-sm"
										>{new Date(user.joined_at).toLocaleDateString()}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<Modal bind:visible={showModal} header="Invite User">
		{#if inviteResponse}
			<div class="space-y-4">
				{#if inviteResponse.created}
					<div class="alert alert-success">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<span>User created successfully!</span>
					</div>

					{#if inviteResponse.temp_password}
						<div class="form-control w-full">
							<label class="label">
								<span class="label-text text-white">Temporary Password</span>
							</label>
							<div class="flex gap-2">
								<input
									class="input input-bordered bg-base-200 border-base-300 text-base-content flex-1"
									value={inviteResponse.temp_password}
									readonly
									type="text"
								/>
								<button
									class="btn btn-primary"
									on:click={() => copyToClipboard(inviteResponse.temp_password)}
								>
									Copy
								</button>
							</div>
							<label class="label">
								<span class="label-text-alt text-white/70">Share this password with the user</span>
							</label>
						</div>
					{/if}
				{:else}
					<div class="alert alert-info">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>Invite sent! User already existed in the system.</span>
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn btn-primary" on:click={resetModal}>Done</button>
			</div>
		{:else}
			<div class="space-y-4">
				<div class="form-control w-full">
					<label class="label" for="first-name">
						<span class="label-text text-white">First Name</span>
					</label>
					<input
						id="first-name"
						class="input input-bordered bg-base-200 border-base-300 text-base-content w-full"
						bind:value={firstName}
						placeholder="Enter first name"
						type="text"
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="last-name">
						<span class="label-text text-white">Last Name</span>
					</label>
					<input
						id="last-name"
						class="input input-bordered bg-base-200 border-base-300 text-base-content w-full"
						bind:value={lastName}
						placeholder="Enter last name"
						type="text"
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="email">
						<span class="label-text text-white">Email</span>
					</label>
					<input
						id="email"
						class="input input-bordered bg-base-200 border-base-300 text-base-content w-full"
						bind:value={email}
						placeholder="Enter email address"
						type="email"
					/>
				</div>

				<div class="form-control w-full">
					<label class="label" for="user-type">
						<span class="label-text text-white">User Type</span>
					</label>
					<select
						id="user-type"
						class="select select-bordered bg-base-200 border-base-300 text-base-content w-full"
						bind:value={userType}
					>
						<option value="user">User</option>
						<option value="admin">Admin</option>
					</select>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" on:click={resetModal}>Cancel</button>
				<button
					class="btn btn-primary"
					on:click={inviteUser}
					disabled={!firstName.trim() || !lastName.trim() || !email.trim()}
				>
					Invite User
				</button>
			</div>
		{/if}
	</Modal>
</div>

{#if browser && !$selectedTenant}
	<Modal bind:visible={showCreateTenantModal} header="Create Tenant" open>
		<div class="space-y-4">
			<input
				bind:value={newTenantName}
				class="input input-bordered w-full"
				placeholder="Organization Name"
				required
			/>
			{#if createTenantError}
				<p class="text-error text-sm">{createTenantError}</p>
			{/if}
		</div>
		<div class="modal-action">
			<button class="btn btn-ghost" on:click={() => (showCreateTenantModal = false)}>Cancel</button>
			<button class="btn btn-primary" on:click={createTenant} disabled={!newTenantName.trim()}
				>Create</button
			>
		</div>
	</Modal>
{/if}
