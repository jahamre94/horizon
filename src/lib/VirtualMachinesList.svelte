<script lang="ts">
	interface MetricSnapshot {
		time: string;
		value: number;
		metric_name: string;
		labels?: Record<string, any>;
	}

	export let metrics: Record<string, MetricSnapshot[]>;

	interface VirtualMachine {
		name: string;
		state: string;
		vcpus: number;
		memory_mb: number;
		disk_gb?: number;
		uptime_seconds?: number;
		cpu_usage?: number;
		memory_usage?: number;
		network_rx_bytes?: number;
		network_tx_bytes?: number;
		disk_read_bytes?: number;
		disk_write_bytes?: number;
	}

	// VM state colors and descriptions
	const vmStateConfig: Record<string, { color: string; bgColor: string; description: string }> = {
		running: {
			color: 'text-green-600 dark:text-green-400',
			bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
			description: 'VM is running normally'
		},
		shutoff: {
			color: 'text-gray-600 dark:text-gray-400',
			bgColor: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
			description: 'VM is shut down'
		},
		paused: {
			color: 'text-yellow-600 dark:text-yellow-400',
			bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
			description: 'VM is paused'
		},
		pmsuspended: {
			color: 'text-blue-600 dark:text-blue-400',
			bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
			description: 'VM is suspended to memory'
		},
		suspended: {
			color: 'text-blue-600 dark:text-blue-400',
			bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
			description: 'VM is suspended'
		},
		crashed: {
			color: 'text-red-600 dark:text-red-400',
			bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
			description: 'VM has crashed'
		},
		dying: {
			color: 'text-red-600 dark:text-red-400',
			bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
			description: 'VM is dying'
		},
		blocked: {
			color: 'text-orange-600 dark:text-orange-400',
			bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
			description: 'VM is blocked'
		}
	};

	function getVirtualMachines(): VirtualMachine[] {
		const qemuStatusData = metrics['qemu_vm_status'];
		if (!qemuStatusData || qemuStatusData.length === 0) return [];

		// Group by VM name to get the latest status for each VM
		const vmMap = new Map<string, { vm: VirtualMachine; timestamp: string }>();

		qemuStatusData.forEach((snapshot) => {
			if (!snapshot.labels?.vm_name) return;

			const vmName = snapshot.labels.vm_name;
			const state = snapshot.labels.state || 'unknown';
			const vcpus = parseInt(snapshot.labels.vcpus || '0');
			const memory_mb = parseInt(snapshot.labels.memory_mb || '0');

			// Use the most recent snapshot for each VM
			const existingEntry = vmMap.get(vmName);
			const snapshotTime = new Date(snapshot.time).getTime();
			const existingTime = existingEntry ? new Date(existingEntry.timestamp).getTime() : 0;

			if (!existingEntry || snapshotTime > existingTime) {
				vmMap.set(vmName, {
					vm: {
						name: vmName,
						state: state,
						vcpus: vcpus,
						memory_mb: memory_mb,
						uptime_seconds: snapshot.labels.uptime_seconds
							? parseInt(snapshot.labels.uptime_seconds.toString())
							: undefined
					},
					timestamp: snapshot.time
				});
			}
		});

		// Enhance with performance metrics
		const vms = Array.from(vmMap.values()).map((entry) => entry.vm);

		// Add CPU usage from qemu_vm_cpu_usage if available
		const cpuUsageData = metrics['qemu_vm_cpu_usage'];
		if (cpuUsageData && cpuUsageData.length > 0) {
			const latestCpuUsage = new Map<string, { value: number; timestamp: string }>();
			cpuUsageData.forEach((snapshot) => {
				if (snapshot.labels?.vm_name) {
					const existing = latestCpuUsage.get(snapshot.labels.vm_name);
					const snapshotTime = new Date(snapshot.time).getTime();
					const existingTime = existing ? new Date(existing.timestamp).getTime() : 0;

					if (!existing || snapshotTime > existingTime) {
						latestCpuUsage.set(snapshot.labels.vm_name, {
							value: snapshot.value,
							timestamp: snapshot.time
						});
					}
				}
			});

			vms.forEach((vm) => {
				const cpuUsage = latestCpuUsage.get(vm.name);
				if (cpuUsage !== undefined) {
					vm.cpu_usage = cpuUsage.value;
				}
			});
		}

		// Add memory usage from qemu_vm_memory_usage if available
		const memoryUsageData = metrics['qemu_vm_memory_usage'];
		if (memoryUsageData && memoryUsageData.length > 0) {
			const latestMemoryUsage = new Map<string, { value: number; timestamp: string }>();
			memoryUsageData.forEach((snapshot) => {
				if (snapshot.labels?.vm_name) {
					const existing = latestMemoryUsage.get(snapshot.labels.vm_name);
					const snapshotTime = new Date(snapshot.time).getTime();
					const existingTime = existing ? new Date(existing.timestamp).getTime() : 0;

					if (!existing || snapshotTime > existingTime) {
						latestMemoryUsage.set(snapshot.labels.vm_name, {
							value: snapshot.value,
							timestamp: snapshot.time
						});
					}
				}
			});

			vms.forEach((vm) => {
				const memoryUsage = latestMemoryUsage.get(vm.name);
				if (memoryUsage !== undefined) {
					vm.memory_usage = memoryUsage.value;
				}
			});
		}

		return vms.sort((a, b) => a.name.localeCompare(b.name));
	}

	function formatMemory(mb: number): string {
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)} GB`;
		}
		return `${mb} MB`;
	}

	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	function getStateConfig(state: string) {
		return vmStateConfig[state] || vmStateConfig.shutoff;
	}

	// Get state summary
	function getStateSummary(
		vms: VirtualMachine[]
	): Array<{ state: string; count: number; config: any }> {
		const stateCounts = new Map<string, number>();

		vms.forEach((vm) => {
			const count = stateCounts.get(vm.state) || 0;
			stateCounts.set(vm.state, count + 1);
		});

		return Array.from(stateCounts.entries())
			.map(([state, count]) => ({
				state,
				count,
				config: getStateConfig(state)
			}))
			.sort((a, b) => b.count - a.count);
	}

	// Get resource summary
	function getResourceSummary(vms: VirtualMachine[]): {
		totalVcpus: number;
		totalMemoryMb: number;
		runningVcpus: number;
		runningMemoryMb: number;
	} {
		return vms.reduce(
			(acc, vm) => {
				acc.totalVcpus += vm.vcpus;
				acc.totalMemoryMb += vm.memory_mb;

				if (vm.state === 'running') {
					acc.runningVcpus += vm.vcpus;
					acc.runningMemoryMb += vm.memory_mb;
				}

				return acc;
			},
			{ totalVcpus: 0, totalMemoryMb: 0, runningVcpus: 0, runningMemoryMb: 0 }
		);
	}

	$: virtualMachines = getVirtualMachines();
	$: stateSummary = getStateSummary(virtualMachines);
	$: resourceSummary = getResourceSummary(virtualMachines);
</script>

{#if virtualMachines.length > 0}
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			<h3 class="card-title text-lg">Virtual Machines</h3>

			<!-- Summary Stats -->
			<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Total VMs -->
				<div class="stat bg-base-200/50 rounded-lg p-4">
					<div class="stat-title text-xs">Total VMs</div>
					<div class="stat-value text-2xl">{virtualMachines.length}</div>
				</div>

				<!-- Resource Allocation -->
				<div class="stat bg-base-200/50 rounded-lg p-4">
					<div class="stat-title text-xs">Total Resources</div>
					<div class="stat-value text-lg">{resourceSummary.totalVcpus} vCPUs</div>
					<div class="stat-desc">{formatMemory(resourceSummary.totalMemoryMb)} RAM</div>
				</div>

				<!-- Running Resources -->
				<div class="stat rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
					<div class="stat-title text-xs">Running Resources</div>
					<div class="stat-value text-lg text-green-600 dark:text-green-400">
						{resourceSummary.runningVcpus} vCPUs
					</div>
					<div class="stat-desc text-green-600 dark:text-green-400">
						{formatMemory(resourceSummary.runningMemoryMb)} RAM
					</div>
				</div>
			</div>

			<!-- State Summary -->
			{#if stateSummary.length > 0}
				<div class="mb-6">
					<div class="mb-3 text-sm font-medium">State Summary</div>
					<div class="flex flex-wrap gap-2">
						{#each stateSummary as { state, count, config }}
							<div class="badge badge-lg {config.color} {config.bgColor} gap-2">
								<span class="capitalize">{state}</span>
								<span class="font-bold">{count}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- VM List -->
			<div class="space-y-3">
				{#each virtualMachines as vm}
					{@const stateConfig = getStateConfig(vm.state)}
					<div class="card border {stateConfig.bgColor} shadow-sm">
						<div class="card-body p-4">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-3">
										<h4 class="font-semibold">{vm.name}</h4>
										<div class="tooltip" data-tip={stateConfig.description}>
											<span
												class="badge badge-sm {stateConfig.color} {stateConfig.bgColor} capitalize"
											>
												{vm.state}
											</span>
										</div>
									</div>

									<div class="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
										<!-- vCPUs -->
										<div>
											<div class="text-base-content/70 text-xs">vCPUs</div>
											<div class="font-medium">{vm.vcpus}</div>
										</div>

										<!-- Memory -->
										<div>
											<div class="text-base-content/70 text-xs">Memory</div>
											<div class="font-medium">{formatMemory(vm.memory_mb)}</div>
										</div>

										<!-- CPU Usage -->
										{#if vm.cpu_usage !== undefined}
											<div>
												<div class="text-base-content/70 text-xs">CPU Usage</div>
												<div class="font-medium">{vm.cpu_usage.toFixed(1)}%</div>
											</div>
										{/if}

										<!-- Memory Usage -->
										{#if vm.memory_usage !== undefined}
											<div>
												<div class="text-base-content/70 text-xs">Memory Usage</div>
												<div class="font-medium">{vm.memory_usage.toFixed(1)}%</div>
											</div>
										{/if}

										<!-- Uptime -->
										{#if vm.uptime_seconds !== undefined}
											<div>
												<div class="text-base-content/70 text-xs">Uptime</div>
												<div class="font-medium">{formatUptime(vm.uptime_seconds)}</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
