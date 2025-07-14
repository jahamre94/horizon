import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { version } from './package.json';

import devtoolsJson from 'vite-plugin-devtools-json';
import path from 'path';
export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(version)
	},
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	resolve: {
		alias: {
			$store: path.resolve(__dirname, 'src/store')
		}
	}
});
