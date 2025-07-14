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
	<div class="bg-base-100 border-base-300 w-full max-w-sm rounded-xl border p-6 shadow-lg">
		<h1 class="text-primary mb-4 text-xl font-bold">Sign in to CosmosWatcher</h1>

		{#if error}
			<div class="alert alert-error mb-3 text-sm">{error}</div>
		{/if}

		<form on:submit|preventDefault={handleLogin}>
			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				class="input input-bordered mb-3 w-full"
				required
			/>
			<input
				type="password"
				placeholder="Password"
				bind:value={password}
				class="input input-bordered mb-4 w-full"
				required
			/>
			<button type="submit" class="btn btn-primary w-full">Login</button>
		</form>
	</div>
</div>
