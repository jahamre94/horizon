<script lang="ts">
	import { selectedTenant } from '$lib/stores/auth';
	import { apiPost } from '$lib/api/api';
	import Modal from '$lib/Modal.svelte';
	import ObserverList from './ObserverList.svelte';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';

	let tenantId = '';
	let tenantName = '';
	let unsubscribe = selectedTenant.subscribe((tenant) => {
		tenantId = tenant?.id || '';
		tenantName = tenant?.name || '';
	});

	onDestroy(unsubscribe);

	let showAddAgentModal = false;
	let agentName = '';
	let interval = 30;
	let bootstrapToken: string | null = null;
	let expiresAt: string | null = null;
	let serverUrl = '';
	let selectedType = 'linux-amd64';
	const availableTypes = [
		{ value: 'linux-amd64', label: 'Linux (x86_64)' },
		{ value: 'linux-arm64', label: 'Linux ARM64 (Raspberry Pi, Unifi Gateway, etc.)' }
	];

	let tags: { key: string; value: string }[] = [{ key: '', value: '' }];
	let showToast = false;
	let toastMessage = '';
	let copiedStates: Record<string, boolean> = {};

	// Get server URL from browser location
	if (browser) {
		serverUrl = `${window.location.protocol}//${window.location.host}`;
	}

	async function createBootstrapToken() {
		const tagMap: Record<string, string> = {};
		for (const t of tags) {
			if (t.key.trim() !== '') {
				tagMap[t.key.trim()] = t.value.trim();
			}
		}

		const res = await apiPost<
			{ token: string; expires_at: string },
			{ name: string; interval: number; type?: string; tags?: Record<string, string> }
		>('/api/observer/bootstrap-token', {
			name: agentName.trim(),
			interval,
			type: selectedType,
			tags: tagMap
		});

		if (res.success) {
			bootstrapToken = res.data.token;
			expiresAt = res.data.expires_at;
		} else {
			alert('Failed to create bootstrap token: ' + res.error);
		}
	}

	function resetModal() {
		agentName = '';
		interval = 30;
		bootstrapToken = null;
		expiresAt = null;
		tags = [{ key: '', value: '' }];
		selectedType = 'linux-amd64';
		copiedStates = {};
		showAddAgentModal = false;
	}

	function yamlEchoCommand() {
		return `echo 'bootstrap_token: ${bootstrapToken}\nserver_url: ${serverUrl}' > observer.yaml`;
	}

	function getExecutableFilename() {
		const typeMap: Record<string, string> = {
			'linux-amd64': 'observer',
			'linux-arm64': 'observer',
			'darwin-arm64': 'observer'
		};
		return typeMap[selectedType] || 'observer';
	}

	function getDownloadUrl() {
		// Map selectedType to platform/architecture
		const typeMap: Record<string, { platform: string; architecture: string; filename: string }> = {
			'linux-amd64': { platform: 'linux', architecture: 'amd64', filename: 'observer' },
			'linux-arm64': { platform: 'linux', architecture: 'arm64', filename: 'observer' },
			'darwin-amd64': { platform: 'darwin', architecture: 'amd64', filename: 'observer' },
			'darwin-arm64': { platform: 'darwin', architecture: 'arm64', filename: 'observer' },
			'windows-amd64': { platform: 'windows', architecture: 'x86_64', filename: 'observer.exe' },
			'windows-arm64': { platform: 'windows', architecture: 'arm64', filename: 'observer.exe' }
		};

		const { platform, architecture, filename } = typeMap[selectedType];
		const path = `${platform}/${architecture}/${filename}`;

		if (browser) {
			return `${serverUrl}/api/files/bins/${path}`;
		} else {
			return `https://cloud.cosmoswatcher/api/files/bins/${path}`;
		}
	}

	function copyToClipboard(text: string, buttonId: string) {
		if (browser) {
			navigator.clipboard.writeText(text);
			copiedStates[buttonId] = true;
			showToast = true;
			toastMessage = 'Command copied to clipboard!';
			setTimeout(() => {
				showToast = false;
				copiedStates[buttonId] = false;
			}, 2000);
		}
	}
</script>

<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" href="/favicon.ico" type="image/x-icon" />

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-base-content text-2xl font-bold">Observers for Tenant: {tenantName}</h1>
			<p class="text-base-content/70 mt-1 text-sm">Deploy agents to monitor systems</p>
		</div>
		<button class="btn btn-primary gap-2" on:click={() => (showAddAgentModal = true)}>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add observer
		</button>
	</div>

	<!-- Observer List Component -->
	<ObserverList />

	<Modal bind:visible={showAddAgentModal} header="Add Observer Agent">
		{#if bootstrapToken}
			<p class="text-success">
				Token created and expires at: {expiresAt ? new Date(expiresAt).toLocaleString() : 'Unknown'}
			</p>

			<div class="mt-4 space-y-4">
				<h3 class="text-lg font-semibold">Installation Steps</h3>

				<!-- Download command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
curl -LO {getDownloadUrl()}</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() => copyToClipboard(`curl -LO ${getDownloadUrl()}`, 'download')}
						title="Copy to clipboard"
					>
						{#if copiedStates['download']}
							<svg
								class="text-success h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>
				</div>

				<!-- Config command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
{yamlEchoCommand()}</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() => copyToClipboard(yamlEchoCommand(), 'config')}
						title="Copy to clipboard"
					>
						{#if copiedStates['config']}
							<svg
								class="text-success h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>
				</div>

				<!-- Execute command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
chmod +x {getExecutableFilename()} && ./{getExecutableFilename()} --config=observer.yaml</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() =>
							copyToClipboard(
								`chmod +x ${getExecutableFilename()} && ./${getExecutableFilename()} --config=observer.yaml`,
								'execute'
							)}
						title="Copy to clipboard"
					>
						{#if copiedStates['execute']}
							<svg
								class="text-success h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>
				</div>

				<!-- Install command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
sudo ./{getExecutableFilename()} install</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() => copyToClipboard(`sudo ./${getExecutableFilename()} install`, 'install')}
						title="Copy to clipboard"
					>
						{#if copiedStates['install']}
							<svg
								class="text-success h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>
				</div>

				<!-- Monitor logs command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
journalctl -u cosmoswatcher-observer -f</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() => copyToClipboard('journalctl -u cosmoswatcher-observer -f', 'logs')}
						title="Copy to clipboard"
					>
						{#if copiedStates['logs']}
							<svg
								class="text-success h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-primary" on:click={resetModal}>Done</button>
			</div>
		{:else}
			<div class="space-y-4">
				<!-- Agent Name -->
				<div class="form-control w-full">
					<label class="label" for="agent-name">
						<span class="label-text">Agent Name</span>
					</label>
					<input
						id="agent-name"
						type="text"
						class="input input-bordered w-full"
						bind:value={agentName}
						placeholder="e.g. db-prod-01"
					/>
				</div>

				<!-- Interval -->
				<div class="form-control w-full">
					<label class="label" for="poll-interval">
						<span class="label-text">Poll Interval (seconds)</span>
					</label>
					<input
						id="poll-interval"
						type="number"
						class="input input-bordered w-full"
						bind:value={interval}
						min={10}
					/>
				</div>

				<!-- Observer Type -->
				<div class="form-control w-full">
					<label class="label" for="observer-type">
						<span class="label-text">Operating System & Architecture</span>
					</label>
					<div id="observer-type" class="grid grid-cols-2 gap-2">
						{#each availableTypes as type}
							<label class="cursor-pointer">
								<input
									type="radio"
									name="observer-type"
									bind:group={selectedType}
									value={type.value}
									class="sr-only"
								/>
								<div
									class="hover:border-primary/50 rounded-lg border-2 p-3 transition-all duration-200 {selectedType ===
									type.value
										? 'border-primary bg-primary/10'
										: 'border-base-300'}"
								>
									<div class="flex items-center gap-3">
										<div class="flex-shrink-0">
											<div
												class="h-4 w-4 rounded-full border-2 transition-all duration-200 {selectedType ===
												type.value
													? 'border-primary bg-primary'
													: 'border-base-300'}"
											>
												{#if selectedType === type.value}
													<div class="bg-primary-content h-full w-full scale-50 rounded-full"></div>
												{/if}
											</div>
										</div>
										<div class="flex-1">
											<div class="text-sm font-medium">{type.label}</div>
										</div>
									</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<!-- Tags -->
				<div class="form-control w-full">
					<label class="label" for="tags-section">
						<span class="label-text">Tags</span>
						<span class="label-text-alt">Optional</span>
					</label>
					<div id="tags-section" class="space-y-2">
						{#each tags as tag, i (i)}
							<div class="flex items-center gap-2">
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={tag.key}
									placeholder="Key"
								/>
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={tag.value}
									placeholder="Value"
								/>
								<button
									class="btn btn-error btn-sm btn-square"
									on:click={() => {
										if (tags.length > 1) {
											tags.splice(i, 1);
										} else {
											tags[0] = { key: '', value: '' };
										}
										tags = tags; // Force reactivity
									}}
									title="Remove tag"
								>
									✕
								</button>
							</div>
						{/each}
						<button
							class="btn btn-outline btn-sm w-full"
							on:click={() => {
								tags.push({ key: '', value: '' });
								tags = tags; // Force reactivity
							}}
						>
							+ Add Tag
						</button>
					</div>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" on:click={resetModal}>Cancel</button>
				<button
					class="btn btn-primary"
					on:click={createBootstrapToken}
					disabled={!agentName.trim()}
				>
					Create Token
				</button>
			</div>
		{/if}
	</Modal>
</div>

<!-- Toast notification -->
{#if showToast}
	<div class="toast toast-top toast-end">
		<div class="alert alert-success">
			<span>{toastMessage}</span>
		</div>
	</div>
{/if}
