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
	let selectedType = 'generic';
	const availableTypes = ['generic']; // You can add more later

	let tags: { key: string; value: string }[] = [{ key: '', value: '' }];

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
		showAddAgentModal = false;
	}

	function yamlEchoCommand() {
		return `echo 'bootstrap_token: ${bootstrapToken}\nserver_url: ${serverUrl}' > observer.yaml`;
	}

	function getDownloadUrl() {
		return browser
			? `${serverUrl}/observer-linux-amd64`
			: 'https://watch.cosmos/observer-linux-amd64';
	}

	function copyToClipboard(text: string) {
		if (browser) {
			navigator.clipboard.writeText(text);
		}
	}
</script>

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
			Add Agent
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
						on:click={() => copyToClipboard(`curl -LO ${getDownloadUrl()}`)}
						title="Copy to clipboard"
					>
						📋
					</button>
				</div>

				<!-- Config command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
{yamlEchoCommand()}</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() => copyToClipboard(yamlEchoCommand())}
						title="Copy to clipboard"
					>
						📋
					</button>
				</div>

				<!-- Execute command -->
				<div class="relative">
					<pre class="bg-base-200 overflow-x-auto rounded-md p-3 pr-12 text-sm"><code>
chmod +x observer-linux-amd64 && ./observer-linux-amd64 --config=observer.yaml</code
						></pre>
					<button
						class="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
						on:click={() =>
							copyToClipboard(
								'chmod +x observer-linux-amd64 && ./observer-linux-amd64 --config=observer.yaml'
							)}
						title="Copy to clipboard"
					>
						📋
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
						<span class="label-text">Observer Type</span>
					</label>
					<div id="observer-type" class="space-y-2">
						{#each availableTypes as t}
							<label class="label cursor-pointer justify-start gap-2">
								<input
									type="radio"
									name="observer-type"
									bind:group={selectedType}
									value={t}
									class="radio"
								/>
								<span class="label-text capitalize">{t}</span>
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
