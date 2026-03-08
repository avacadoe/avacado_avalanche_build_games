import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
	plugins: [
		react(),
		nodePolyfills({
			include: ["crypto", "buffer", "stream", "util", "process", "fs"],
			globals: {
				Buffer: true,
				global: true,
				process: true,
			},
		}),
	],
	resolve: {
		alias: {
			"node:crypto": "crypto",
			"node:buffer": "buffer",
			"node:stream": "stream",
			"node:util": "util",
			"node:process": "process",
			"node:fs": "fs",
		},
	},
	build: {
		commonjsOptions: {
			transformMixedEsModules: true,
		},
		rollupOptions: {
			onwarn(warning, warn) {
				// Suppress warnings about polyfill shims
				if (warning.code === 'UNRESOLVED_IMPORT' && warning.message?.includes('vite-plugin-node-polyfills/shims')) {
					return;
				}
				warn(warning);
			}
		}
	},
});
