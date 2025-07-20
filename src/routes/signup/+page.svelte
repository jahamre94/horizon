<script lang="ts">
	import { goto } from '$app/navigation';

	let firstName = '';
	let lastName = '';
	let email = '';
	let password = '';
	let orgName = '';
	let selectedPlan = 'free-personal';
	let acceptTerms = false;

	let loading = false;
	let message = '';
	let error = '';

	const plans = [
		{
			id: 'free-personal',
			name: 'Personal',
			price: 'Free',
			description: 'Perfect for individual observers exploring the cosmos',
			type: 'personal'
		}
	];

	$: isPersonalPlan = plans.find((p) => p.id === selectedPlan)?.type === 'personal';

	async function submit() {
		message = '';
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: firstName,
					last_name: lastName,
					email,
					password,
					org_name: orgName,
					plan: selectedPlan
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
					Welcome to the
					<span class="text-accent">Horizon</span>
				</h1>
				<p class="text-primary-content/90 mb-6 text-lg leading-relaxed">
					Join thousands of observers exploring the cosmic infrastructure. Monitor, analyze, and
					optimize your digital universe.
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

	<!-- Right Side - Registration Form -->
	<div class="bg-base-100 flex w-full items-center justify-center px-6 py-8 lg:w-1/2">
		<div class="w-full max-w-md space-y-6">
			<!-- Logo and Header -->
			<div class="text-center">
				<img src="/logo.png" alt="CosmosWatcher" class="mx-auto mb-3 h-12 w-auto" />
				<h2 class="text-base-content text-2xl font-bold tracking-tight">Create Account</h2>
				<p class="text-base-content/70 mt-1 text-sm">Join the Horizon Portal today</p>
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

			{#if message}
				<div class="alert alert-success text-sm">
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
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{message}</span>
				</div>
			{/if}

			<!-- Registration Form -->
			<form on:submit|preventDefault={submit} class="space-y-4">
				<!-- Plan Selection -->
				<div class="space-y-2">
					<span class="text-base-content text-sm font-medium">Choose Your Plan</span>
					<div class="space-y-2">
						{#each plans as plan}
							<label
								class="border-base-300 hover:border-primary/50 flex cursor-pointer items-center space-x-3 rounded-lg border-2 p-3 transition-all {selectedPlan ===
								plan.id
									? 'border-primary bg-primary/5'
									: ''}"
							>
								<input
									type="radio"
									bind:group={selectedPlan}
									value={plan.id}
									class="radio radio-primary radio-sm"
								/>
								<div class="flex-1">
									<div class="flex items-center justify-between">
										<span class="text-base-content text-sm font-semibold">{plan.name}</span>
										<span class="text-primary text-sm font-bold">{plan.price}</span>
									</div>
									<p class="text-base-content/70 mt-1 text-xs">{plan.description}</p>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Name Fields -->
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="firstName" class="text-base-content text-sm font-medium">First Name</label>
						<input
							id="firstName"
							type="text"
							placeholder="John"
							bind:value={firstName}
							class="input input-bordered input-sm bg-base-200/50 border-base-300 focus:border-primary focus:bg-base-100 w-full transition-all"
							required
						/>
					</div>
					<div class="space-y-1">
						<label for="lastName" class="text-base-content text-sm font-medium">Last Name</label>
						<input
							id="lastName"
							type="text"
							placeholder="Doe"
							bind:value={lastName}
							class="input input-bordered input-sm bg-base-200/50 border-base-300 focus:border-primary focus:bg-base-100 w-full transition-all"
							required
						/>
					</div>
				</div>

				<!-- Email -->
				<div class="space-y-1">
					<label for="email" class="text-base-content text-sm font-medium">Email</label>
					<input
						id="email"
						type="email"
						placeholder="example@cosmoswather.com"
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

				<!-- Organization/System Name -->
				<div class="space-y-1">
					<label for="orgName" class="text-base-content text-sm font-medium">
						{isPersonalPlan ? 'System Name' : 'Organization Name'}
					</label>
					<input
						id="orgName"
						type="text"
						placeholder={isPersonalPlan ? 'My Cosmic System' : 'Acme Cosmos Inc.'}
						bind:value={orgName}
						class="input input-bordered input-sm bg-base-200/50 border-base-300 focus:border-primary focus:bg-base-100 w-full transition-all"
						required
					/>
				</div>

				<!-- Terms and Conditions -->
				<div class="space-y-2">
					<label class="flex cursor-pointer items-start space-x-3">
						<input
							type="checkbox"
							bind:checked={acceptTerms}
							class="checkbox checkbox-primary checkbox-sm mt-0.5"
							required
						/>
						<span class="text-base-content/80 text-xs leading-relaxed">
							I agree to the
							<a
								href="https://cosmoswatcher.com/terms"
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary hover:text-primary/80 underline transition-colors"
							>
								Terms and Conditions
							</a>
							and
							<a
								href="https://cosmoswatcher.com/privacy"
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary hover:text-primary/80 underline transition-colors"
							>
								Privacy Policy
							</a>
						</span>
					</label>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					class="btn btn-primary h-10 w-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
					disabled={loading || !acceptTerms}
				>
					{#if loading}
						<span class="loading loading-spinner loading-sm"></span>
						Creating Account...
					{:else}
						Create Account
					{/if}
				</button>
			</form>

			<!-- Sign In Link -->
			<div class="border-base-300 border-t pt-4 text-center">
				<p class="text-base-content/70 mb-2 text-xs">Already have an account?</p>
				<a href="/login" class="btn btn-outline btn-sm hover:btn-primary transition-all">
					Sign In to Horizon
				</a>
			</div>
		</div>
	</div>
</div>
