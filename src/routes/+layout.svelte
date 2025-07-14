<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div data-theme="theme-cosmoswatcher">
	{@render children()}
</div>
