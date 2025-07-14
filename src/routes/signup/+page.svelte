<script lang="ts">
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let orgName = '';
	let accountOnly = false;

	let loading = false;
	let message = '';
	let error = '';

	async function submit() {
		message = '';
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					org_name: orgName,
					account_only: accountOnly
				})
			});

			const contentType = res.headers.get('content-type');

			if (!res.ok) {
				loading = false;
				if (contentType && contentType.includes('application/json')) {
					const { error: errMsg } = await res.json();
					error = errMsg || 'Signup failed.';
				} else {
					const msg = await res.text();
					error = msg || 'Signup failed.';
				}
				return;
			}

			const data = await res.json();
			message = data.message;
			setTimeout(() => goto('/login'), 2000);
		} catch (e) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center px-4">
	<div class="bg-base-100 border-base-300 w-full max-w-sm rounded-xl border p-6 shadow-2xl">
		<div class="mb-6 text-center">
			<img src="/logo.png" alt="CosmosWatcher" class="mx-auto mb-3 w-40" />
			<p class="text-base-content/70 text-sm">Join the Horizon Portal</p>
		</div>

		{#if error}
			<div class="alert alert-error mb-4 text-sm">{error}</div>
		{/if}

		{#if message}
			<div class="alert alert-success mb-4 text-sm">{message}</div>
		{/if}

		<form on:submit|preventDefault={submit}>
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
				class="input input-bordered bg-base-200 text-base-content placeholder-base-content/50 mb-3 w-full"
				required
			/>

			<div class="form-control mb-3">
				<label class="label cursor-pointer justify-start gap-3">
					<input type="checkbox" bind:checked={accountOnly} class="checkbox checkbox-primary" />
					<span class="label-text text-base-content/80 text-sm">Account only (no organization)</span
					>
				</label>
			</div>

			{#if !accountOnly}
				<input
					type="text"
					placeholder="Organization Name"
					bind:value={orgName}
					class="input input-bordered bg-base-200 text-base-content placeholder-base-content/50 mb-4 w-full"
					required
				/>
			{/if}

			<button type="submit" class="btn btn-primary w-full" disabled={loading}>
				{loading ? 'Creating...' : 'Create Account'}
			</button>
		</form>

		<div class="mt-4 text-center">
			<p class="text-base-content/70 mb-2 text-sm">Already have an account?</p>
			<a href="/login" class="btn btn-outline btn-sm">Sign In</a>
		</div>
	</div>
</div>
