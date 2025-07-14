<script lang="ts">
	import { loginUser } from '$lib/api/auth';
	import { isGlobalAdmin, tenantList } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let error = '';

	async function handleLogin() {
		error = '';
		const result = await loginUser(email, password);
		if (!result.success) {
			error = result.error ?? 'Login failed';
			return;
		}

		const payload = JSON.parse(localStorage.getItem('user_payload') || '{}');
		isGlobalAdmin.set(payload.is_global_admin || false);
		tenantList.set(payload.tenants || []);
		goto('/home');
	}
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center px-4">
	<div class="bg-base-100 border-base-300 w-full max-w-sm rounded-xl border p-6 shadow-2xl">
		<div class="mb-6 text-center">
			<h1 class="text-primary mb-2 text-2xl font-bold">CosmosWatcher</h1>
			<p class="text-base-content/70 text-sm">Enter the Horizon Portal</p>
		</div>

		{#if error}
			<div class="alert alert-error mb-4 text-sm">{error}</div>
		{/if}

		<form on:submit|preventDefault={handleLogin}>
			<input
				type="email"
				placeholder="Observer Email"
				bind:value={email}
				class="input input-bordered bg-base-200 text-base-content placeholder-base-content/50 mb-3 w-full"
				required
			/>
			<input
				type="password"
				placeholder="Access Key"
				bind:value={password}
				class="input input-bordered bg-base-200 text-base-content placeholder-base-content/50 mb-4 w-full"
				required
			/>
			<button type="submit" class="btn btn-primary w-full">Access Horizon</button>
		</form>
	</div>
</div>
