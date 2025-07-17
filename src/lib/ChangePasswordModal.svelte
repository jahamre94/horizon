<script lang="ts">
	import { changePassword } from '$lib/api/auth';
	import Modal from '$lib/Modal.svelte';

	export let visible: boolean = false;

	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let loading = false;
	let error = '';
	let success = false;

	// Frontend validation
	$: newPasswordValid = newPassword.length >= 8;
	$: passwordsMatch = newPassword === confirmPassword;
	$: formValid = currentPassword && newPasswordValid && passwordsMatch;

	async function handleSubmit() {
		if (!formValid) return;

		loading = true;
		error = '';
		success = false;

		const result = await changePassword(currentPassword, newPassword);

		if (result.success) {
			success = true;
			// Clear form after successful change
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';

			// Close modal after a short delay to show success message
			setTimeout(() => {
				visible = false;
				success = false;
			}, 2000);
		} else {
			error = result.error || 'Failed to change password';
		}

		loading = false;
	}

	function handleClose() {
		visible = false;
		// Reset form when closing
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		error = '';
		success = false;
	}
</script>

<Modal {visible} header="Change Password" on:close={handleClose}>
	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<!-- Current Password -->
		<div>
			<label for="current-password" class="mb-2 block text-sm font-medium text-slate-300">
				Current Password
			</label>
			<input
				id="current-password"
				type="password"
				bind:value={currentPassword}
				placeholder="Enter your current password"
				class="input input-bordered w-full border-slate-600 bg-slate-700 text-white focus:border-blue-500"
				required
				disabled={loading}
			/>
		</div>

		<!-- New Password -->
		<div>
			<label for="new-password" class="mb-2 block text-sm font-medium text-slate-300">
				New Password
			</label>
			<input
				id="new-password"
				type="password"
				bind:value={newPassword}
				placeholder="Enter new password (minimum 8 characters)"
				class="input input-bordered w-full border-slate-600 bg-slate-700 text-white focus:border-blue-500"
				class:border-red-500={newPassword && !newPasswordValid}
				class:border-green-500={newPassword && newPasswordValid}
				required
				disabled={loading}
			/>
			{#if newPassword && !newPasswordValid}
				<p class="mt-1 text-xs text-red-400">Password must be at least 8 characters long</p>
			{/if}
		</div>

		<!-- Confirm New Password -->
		<div>
			<label for="confirm-password" class="mb-2 block text-sm font-medium text-slate-300">
				Confirm New Password
			</label>
			<input
				id="confirm-password"
				type="password"
				bind:value={confirmPassword}
				placeholder="Confirm your new password"
				class="input input-bordered w-full border-slate-600 bg-slate-700 text-white focus:border-blue-500"
				class:border-red-500={confirmPassword && !passwordsMatch}
				class:border-green-500={confirmPassword && passwordsMatch}
				required
				disabled={loading}
			/>
			{#if confirmPassword && !passwordsMatch}
				<p class="mt-1 text-xs text-red-400">Passwords do not match</p>
			{/if}
		</div>

		<!-- Error Message -->
		{#if error}
			<div class="alert alert-error">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>{error}</span>
			</div>
		{/if}

		<!-- Success Message -->
		{#if success}
			<div class="alert alert-success">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>Password changed successfully!</span>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="modal-action">
			<button
				type="button"
				class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700"
				on:click={handleClose}
				disabled={loading}
			>
				Cancel
			</button>
			<button type="submit" class="btn btn-primary" disabled={!formValid || loading}>
				{#if loading}
					<span class="loading loading-spinner loading-sm"></span>
					Changing...
				{:else}
					Change Password
				{/if}
			</button>
		</div>
	</form>
</Modal>
