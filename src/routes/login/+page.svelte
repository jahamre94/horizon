<script lang="ts">
	import { loginUser } from '$lib/api/auth';
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

		goto('/home');
	}
</script>

<div class="flex h-screen">
	<!-- Left Side - Marketing Content -->
	<div
		class="from-primary to-primary/80 relative hidden overflow-hidden bg-gradient-to-br lg:flex lg:w-1/2"
	>
		<div
			class="absolute inset-0 bg-[url('/logo.png')] bg-contain bg-center bg-no-repeat opacity-5"
		></div>
		<div class="text-primary-content relative z-10 flex flex-col justify-center px-12">
			<div class="max-w-md">
				<h1 class="mb-4 text-4xl font-bold tracking-tight">
					Welcome back to
					<span class="text-accent">Horizon</span>
				</h1>
				<p class="text-primary-content/90 mb-6 text-lg leading-relaxed">
					Continue your cosmic exploration. Access your dashboard and monitor your digital universe.
				</p>
				<div class="space-y-3">
					<div class="flex items-center space-x-3">
						<div class="bg-accent h-2 w-2 rounded-full"></div>
						<span class="text-primary-content/80">Real-time cosmic monitoring</span>
					</div>
					<div class="flex items-center space-x-3">
						<div class="bg-accent h-2 w-2 rounded-full"></div>
						<span class="text-primary-content/80">Advanced analytics dashboard</span>
					</div>
					<div class="flex items-center space-x-3">
						<div class="bg-accent h-2 w-2 rounded-full"></div>
						<span class="text-primary-content/80">Seamless agent integration</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Right Side - Login Form -->
	<div class="bg-base-100 flex w-full items-center justify-center px-6 py-8 lg:w-1/2">
		<div class="w-full max-w-md space-y-6">
			<!-- Logo and Header -->
			<div class="text-center">
				<img src="/logo.png" alt="CosmosWatcher" class="mx-auto mb-3 h-12 w-auto" />
				<h2 class="text-base-content text-2xl font-bold tracking-tight">Welcome Back</h2>
				<p class="text-base-content/70 mt-1 text-sm">Enter the Horizon Portal</p>
			</div>

			<!-- Alert Messages -->
			{#if error}
				<div class="alert alert-error text-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 shrink-0 stroke-current"
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

			<!-- Login Form -->
			<form on:submit|preventDefault={handleLogin} class="space-y-4">
				<!-- Email -->
				<div class="space-y-1">
					<label for="email" class="text-base-content text-sm font-medium">Email</label>
					<input
						id="email"
						type="email"
						placeholder="observer@cosmoswatcher.com"
						bind:value={email}
						class="input input-bordered input-sm bg-base-200/50 border-base-300 focus:border-primary focus:bg-base-100 w-full transition-all"
						required
					/>
				</div>

				<!-- Password -->
				<div class="space-y-1">
					<label for="password" class="text-base-content text-sm font-medium">Access Key</label>
					<input
						id="password"
						type="password"
						placeholder="••••••••••••"
						bind:value={password}
						class="input input-bordered input-sm bg-base-200/50 border-base-300 focus:border-primary focus:bg-base-100 w-full transition-all"
						required
					/>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					class="btn btn-primary h-10 w-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
				>
					Access Horizon
				</button>
			</form>

			<!-- Sign Up Link -->
			<div class="border-base-300 border-t pt-4 text-center">
				<p class="text-base-content/70 mb-2 text-xs">Need access to the Horizon Portal?</p>
				<a href="/signup" class="btn btn-outline btn-sm hover:btn-primary transition-all">
					Register New Account
				</a>
			</div>
		</div>
	</div>
</div>
