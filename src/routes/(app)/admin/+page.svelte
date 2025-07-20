<script lang="ts">
	import { selectedTenant } from '$lib/stores/auth';
	import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/api';
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

	// Check if current user is owner or admin
	$: isOwner = $selectedTenant?.role === 'owner';
	$: isAdmin = $selectedTenant?.role === 'admin' || isOwner;

	// User management state
	let showEditUserModal = false;
	let showDeleteUserModal = false;
	let selectedUser: UserInTenant | null = null;
	let newRole = '';
	let deleteConfirmText = '';

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
			const newTenantData = res.data as { id: string; name: string; slug: string; role?: string };
			console.log('New tenant created:', newTenantData);

			// Extract only the fields needed for the selectedTenant store
			const newTenant = {
				id: newTenantData.id,
				name: newTenantData.name,
				slug: newTenantData.slug,
				role: newTenantData.role || 'owner' // Default to owner when creating a tenant
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

	// User management functions
	function openEditUserModal(user: UserInTenant) {
		selectedUser = user;
		newRole = user.role;
		showEditUserModal = true;
	}

	function openDeleteUserModal(user: UserInTenant) {
		selectedUser = user;
		deleteConfirmText = '';
		showDeleteUserModal = true;
	}

	function closeEditUserModal() {
		selectedUser = null;
		newRole = '';
		showEditUserModal = false;
	}

	function closeDeleteUserModal() {
		selectedUser = null;
		deleteConfirmText = '';
		showDeleteUserModal = false;
	}

	async function updateUserRole() {
		if (!selectedUser || !newRole) return;

		const res = await apiPut(`/api/admin/users/${selectedUser.id}/role`, {
			role: newRole
		});

		if (res.success) {
			await loadUsers();
			closeEditUserModal();
		} else {
			alert('Failed to update user role: ' + res.error);
		}
	}

	async function deleteUser() {
		if (!selectedUser || deleteConfirmText !== 'DELETE') return;

		const res = await apiDelete(`/api/admin/users/${selectedUser.id}`);

		if (res.success) {
			await loadUsers();
			closeDeleteUserModal();
		} else {
			alert('Failed to delete user: ' + res.error);
		}
	}

	// Prevent users from modifying themselves or other owners (only owners can manage owners)
	function canManageUser(user: UserInTenant): boolean {
		if (!isAdmin) return false;

		// Get current user info from JWT payload
		const userPayload = JSON.parse(localStorage.getItem('user_payload') || '{}');
		const currentUserId = userPayload.sub; // User ID is stored in 'sub' field
		const currentUserEmail = userPayload.email;

		// Can't manage yourself - check by both ID and email for safety
		if (currentUserId && user.id === currentUserId) return false;
		if (currentUserEmail && user.email === currentUserEmail) return false;

		// Only owners can manage other owners
		if (user.role === 'owner' && !isOwner) return false;

		return true;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base-content text-2xl font-bold">{tenantName}</h1>
			<div class="mt-1 flex items-center gap-2">
				<p class="text-base-content/70 text-sm">Manage users and permissions</p>
				{#if $selectedTenant}
					<span
						class="badge badge-outline badge-sm {$selectedTenant.role === 'owner'
							? 'badge-warning'
							: $selectedTenant.role === 'admin'
								? 'badge-success'
								: 'badge-neutral'}"
					>
						Your role: {$selectedTenant.role}
					</span>
				{/if}
			</div>
		</div>
		{#if isOwner}
			<button class="btn btn-primary gap-2" on:click={() => (showModal = true)}>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Invite User
			</button>
		{:else if !isAdmin}
			<div class="text-right">
				<p class="text-base-content/50 text-sm">Only owners can invite users</p>
				<p class="text-base-content/50 text-xs">Only admins and owners can manage users</p>
			</div>
		{/if}
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
				<p class="text-base-content/70">
					{#if isOwner}
						Get started by inviting your first user
					{:else}
						Contact your organization owner to invite users
					{/if}
				</p>
				{#if isOwner}
					<div class="card-actions mt-4 justify-center">
						<button class="btn btn-primary" on:click={() => (showModal = true)}>
							Invite First User
						</button>
					</div>
				{/if}
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
								{#if isAdmin}
									<th>Actions</th>
								{/if}
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
											class="badge badge-outline badge-sm {user.role === 'owner'
												? 'badge-warning'
												: user.role === 'admin'
													? 'badge-success'
													: 'badge-neutral'}"
										>
											{user.role}
										</span>
									</td>
									<td class="text-base-content/70 text-sm"
										>{new Date(user.joined_at).toLocaleDateString()}</td
									>
									{#if isAdmin}
										<td>
											<div class="flex gap-2">
												{#if canManageUser(user)}
													<button
														class="btn btn-ghost btn-xs"
														on:click={() => openEditUserModal(user)}
														aria-label="Edit user role"
														title="Edit user role"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
															/>
														</svg>
													</button>
													<button
														class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
														on:click={() => openDeleteUserModal(user)}
														aria-label="Remove user from tenant"
														title="Remove user from tenant"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												{:else}
													<span class="text-base-content/50 text-xs">No access</span>
												{/if}
											</div>
										</td>
									{/if}
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
							<label class="label" for="temp-password">
								<span class="label-text text-white">Temporary Password</span>
							</label>
							<div class="flex gap-2">
								<input
									id="temp-password"
									class="input input-bordered bg-base-200 border-base-300 text-base-content flex-1"
									value={inviteResponse.temp_password}
									readonly
									type="text"
								/>
								<button
									class="btn btn-primary"
									on:click={() => copyToClipboard(inviteResponse?.temp_password || '')}
								>
									Copy
								</button>
							</div>
							<div class="label">
								<span class="label-text-alt text-white/70">Share this password with the user</span>
							</div>
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
						<option value="owner">Owner</option>
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
	<Modal bind:visible={showCreateTenantModal} header="Create Tenant">
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

<!-- Edit User Role Modal -->
<Modal bind:visible={showEditUserModal} header="Edit User Role">
	{#if selectedUser}
		<div class="space-y-4">
			<div class="text-base-content">
				<p><strong>User:</strong> {selectedUser.first_name} {selectedUser.last_name}</p>
				<p><strong>Email:</strong> {selectedUser.email}</p>
				<p>
					<strong>Current Role:</strong>
					<span class="badge badge-outline badge-sm">{selectedUser.role}</span>
				</p>
			</div>

			<div class="form-control w-full">
				<label class="label" for="new-role">
					<span class="label-text text-white">New Role</span>
				</label>
				<select
					id="new-role"
					class="select select-bordered bg-base-200 border-base-300 text-base-content w-full"
					bind:value={newRole}
				>
					<option value="user">User</option>
					<option value="admin">Admin</option>
					{#if isOwner}
						<option value="owner">Owner</option>
					{/if}
				</select>
			</div>
		</div>

		<div class="modal-action">
			<button class="btn btn-ghost" on:click={closeEditUserModal}>Cancel</button>
			<button
				class="btn btn-primary"
				on:click={updateUserRole}
				disabled={!newRole || newRole === selectedUser.role}
			>
				Update Role
			</button>
		</div>
	{/if}
</Modal>

<!-- Delete User Modal -->
<Modal bind:visible={showDeleteUserModal} header="Remove User from Tenant">
	{#if selectedUser}
		<div class="space-y-4">
			<div class="alert alert-warning">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<span>This action cannot be undone!</span>
			</div>

			<div class="text-base-content">
				<p>You are about to remove this user from the tenant:</p>
				<div class="bg-base-200 mt-2 rounded p-3">
					<p><strong>Name:</strong> {selectedUser.first_name} {selectedUser.last_name}</p>
					<p><strong>Email:</strong> {selectedUser.email}</p>
					<p>
						<strong>Role:</strong>
						<span class="badge badge-outline badge-sm">{selectedUser.role}</span>
					</p>
				</div>
			</div>

			<div class="form-control w-full">
				<label class="label" for="delete-confirm">
					<span class="label-text text-white">Type "DELETE" to confirm</span>
				</label>
				<input
					id="delete-confirm"
					class="input input-bordered bg-base-200 border-base-300 text-base-content w-full"
					bind:value={deleteConfirmText}
					placeholder="DELETE"
					type="text"
				/>
			</div>
		</div>

		<div class="modal-action">
			<button class="btn btn-ghost" on:click={closeDeleteUserModal}>Cancel</button>
			<button class="btn btn-error" on:click={deleteUser} disabled={deleteConfirmText !== 'DELETE'}>
				Remove User
			</button>
		</div>
	{/if}
</Modal>
