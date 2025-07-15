<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let title: string;
	export let data: Array<{
		time: string;
		value: number;
		metric_name: string;
		labels?: Record<string, any>;
		interfaceName?: string;
	}>;
	export let unit: string = '';
	export let color: string = '#3b82f6';
	export let groupBy: string | undefined = undefined;

	let canvas: HTMLCanvasElement;
	let chart: any;

	interface ChartDataPoint {
		x: string;
		y: number;
	}

	// Convert bytes to appropriate unit and determine best unit for the dataset
	function getBestUnitForDataset(data: Array<{ value: number }>): {
		unit: string;
		divisor: number;
	} {
		const maxValue = Math.max(...data.map((d) => d.value));

		if (maxValue < 1024) {
			return { unit: 'B', divisor: 1 };
		} else if (maxValue < 1024 * 1024) {
			return { unit: 'KB', divisor: 1024 };
		} else {
			return { unit: 'MB', divisor: 1024 * 1024 };
		}
	}

	// Check if this is a network metric that should be converted
	function isNetworkMetric(title: string): boolean {
		return title.toLowerCase().includes('network') || title.toLowerCase().includes('bytes');
	}

	onMount(async () => {
		// Dynamically import Chart.js to avoid SSR issues
		const { Chart, registerables } = await import('chart.js');
		await import('chartjs-adapter-date-fns');
		Chart.register(...registerables);

		if (canvas && data.length > 0) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				// Generate colors for different interfaces
				const colors = [
					'#3b82f6',
					'#10b981',
					'#f59e0b',
					'#ef4444',
					'#8b5cf6',
					'#06b6d4',
					'#f97316'
				];

				// Determine the best unit for network metrics
				let actualUnit = unit;
				let divisor = 1;
				if (isNetworkMetric(title)) {
					const bestUnit = getBestUnitForDataset(data);
					actualUnit = bestUnit.unit;
					divisor = bestUnit.divisor;
				}

				let datasets;

				if (groupBy) {
					// Group data by the specified field
					const grouped: Record<string, Array<{ x: string; y: number }>> = {};

					data.forEach((point) => {
						const groupKey = (point as any)[groupBy] || 'unknown';
						if (!grouped[groupKey]) {
							grouped[groupKey] = [];
						}
						grouped[groupKey].push({
							x: point.time,
							y: point.value / divisor
						});
					});

					// Create datasets for each group
					datasets = Object.entries(grouped).map(([groupKey, groupData], index) => {
						const sortedData = groupData.sort(
							(a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()
						);

						return {
							label: groupKey,
							data: sortedData,
							borderColor: colors[index % colors.length],
							backgroundColor: colors[index % colors.length] + '20',
							tension: 0.1,
							fill: false
						};
					});
				} else {
					// Sort data by time
					const sortedData = [...data].sort(
						(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
					);

					const chartData: ChartDataPoint[] = sortedData.map((point) => ({
						x: point.time,
						y: point.value / divisor
					}));

					datasets = [
						{
							label: title,
							data: chartData,
							borderColor: color,
							backgroundColor: color + '20',
							tension: 0.1,
							fill: false
						}
					];
				}

				chart = new Chart(ctx, {
					type: 'line',
					data: {
						datasets: datasets
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							x: {
								type: 'time',
								time: {
									displayFormats: {
										hour: 'HH:mm',
										minute: 'HH:mm'
									}
								},
								title: {
									display: true,
									text: 'Time'
								}
							},
							y: {
								beginAtZero: true,
								title: {
									display: true,
									text: actualUnit || 'Value'
								}
							}
						},
						plugins: {
							legend: {
								display: groupBy !== undefined,
								position: 'right',
								align: 'start',
								labels: {
									boxWidth: 12,
									boxHeight: 2,
									padding: 8,
									font: {
										size: 11
									},
									usePointStyle: true
								}
							},
							title: {
								display: true,
								text: title,
								padding: {
									top: 10,
									bottom: 15
								}
							}
						}
					}
				});
			}
		}
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});

	// Reactive update when data changes
	$: if (chart && data) {
		const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

		// Determine the best unit for network metrics
		let actualUnit = unit;
		let divisor = 1;
		if (isNetworkMetric(title)) {
			const bestUnit = getBestUnitForDataset(data);
			actualUnit = bestUnit.unit;
			divisor = bestUnit.divisor;
		}

		let datasets;

		if (groupBy) {
			// Group data by the specified field
			const grouped: Record<string, Array<{ x: string; y: number }>> = {};

			data.forEach((point) => {
				const groupKey = (point as any)[groupBy] || 'unknown';
				if (!grouped[groupKey]) {
					grouped[groupKey] = [];
				}
				grouped[groupKey].push({
					x: point.time,
					y: point.value / divisor
				});
			});

			// Create datasets for each group
			datasets = Object.entries(grouped).map(([groupKey, groupData], index) => {
				const sortedData = groupData.sort(
					(a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()
				);

				return {
					label: groupKey,
					data: sortedData,
					borderColor: colors[index % colors.length],
					backgroundColor: colors[index % colors.length] + '20',
					tension: 0.1,
					fill: false
				};
			});
		} else {
			const sortedData = [...data].sort(
				(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
			);

			const chartData: ChartDataPoint[] = sortedData.map((point) => ({
				x: point.time,
				y: point.value / divisor
			}));

			datasets = [
				{
					label: title,
					data: chartData,
					borderColor: color,
					backgroundColor: color + '20',
					tension: 0.1,
					fill: false
				}
			];
		}

		chart.data.datasets = datasets;

		// Update the y-axis label
		if (chart.options.scales.y.title) {
			chart.options.scales.y.title.text = actualUnit || 'Value';
		}

		chart.update();
	}
</script>

<div class="card bg-base-100 border-base-200 border shadow-sm">
	<div class="card-body p-4">
		<h3 class="card-title text-base">{title}</h3>
		{#if data.length > 0}
			<div class="h-64 w-full">
				<canvas bind:this={canvas} class="h-full w-full"></canvas>
			</div>
		{:else}
			<div class="text-base-content/50 flex h-64 items-center justify-center">
				<div class="text-center">
					<svg class="mx-auto mb-2 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
					<p class="text-sm">No data available</p>
				</div>
			</div>
		{/if}
	</div>
</div>
