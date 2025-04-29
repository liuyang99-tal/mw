import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vueDevTools(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("svg:style"),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "ical.js": "ical.js/build/ical.js"
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5176,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  define: {
    __VUE_PROD_DEVTOOLS__: true,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true
  },
  optimizeDeps: {
    include: ['vue', 'pinia', '@vueuse/core'],
    exclude: ['@markwhen/parser'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});
