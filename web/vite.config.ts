/// <reference types="vitest/config" />
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

// Relative base so the site works under any path (GitHub Pages project sites).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    // The Astryx theme imports Figtree from Google Fonts; serve it locally instead.
    alias: {'@astryxdesign/theme-neutral/fonts.css': fileURLToPath(new URL('./src/fonts.css', import.meta.url))},
  },
  optimizeDeps: {exclude: ['@duckdb/duckdb-wasm']},
  build: {target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200},
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    coverage: {include: ['src/lib/**', 'src/components/**'], reporter: ['text', 'lcov']},
  },
});
