<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let title: string;
	export let data: Array<{
		time: string;
		value: number;
		metric_name: string;
		labels?: Record<string, any>;
	}>;
	export let unit: string = '';
	export let color: string = '#3b82f6';

	let canvas: HTMLCanvasElement;
	let chart: any;

	interface ChartDataPoint {
		x: string;
		y: number;
	}

	onMount(async () => {
		// Dynamically import Chart.js to avoid SSR issues
		const { Chart, registerables } = await import('chart.js');
		await import('chartjs-adapter-date-fns');
		Chart.register(...registerables);

		if (canvas && data.length > 0) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				// Sort data by time
				const sortedData = [...data].sort(
					(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
				);

				const chartData: ChartDataPoint[] = sortedData.map((point) => ({
					x: point.time,
					y: point.value
				}));

				chart = new Chart(ctx, {
					type: 'line',
					data: {
						datasets: [
							{
								label: title,
								data: chartData,
								borderColor: color,
								backgroundColor: color + '20',
								tension: 0.1,
								fill: false
							}
						]
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
									text: unit || 'Value'
								}
							}
						},
						plugins: {
							legend: {
								display: false
							},
							title: {
								display: true,
								text: title
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
		const sortedData = [...data].sort(
			(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
		);

		const chartData: ChartDataPoint[] = sortedData.map((point) => ({
			x: point.time,
			y: point.value
		}));

		chart.data.datasets[0].data = chartData;
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
