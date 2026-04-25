import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [vue(), cssInjectedByJsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/remote-entry.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'rdocman-remote.js',
    },
    outDir: 'dist-remote',
    rollupOptions: {
      output: {
        assetFileNames: 'remote/assets/[name]-[hash][extname]',
        chunkFileNames: 'remote/chunks/[name]-[hash].js',
        entryFileNames: 'remote/rdocman-remote.js',
      },
    },
    sourcemap: true,
  },
  server: {
    port: 5174,
  },
});
