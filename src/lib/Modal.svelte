<script lang="ts">
	export let visible: boolean = false;
	export let header: string | undefined = undefined;
</script>

{#if visible}
	<div class="modal modal-open">
		<div
			class="modal-box border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl"
		>
			{#if header}
				<h3 class="mb-4 text-lg font-bold text-white">{header}</h3>
			{/if}
			<slot />
		</div>
	</div>
{/if}
