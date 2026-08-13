import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages project site: https://<user>.github.io/Enterprise-Architecture/
// Override with BASE_PATH=/ for root deployments or local static previews.
const base = process.env.BASE_PATH ?? '/Enterprise-Architecture/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    // 404.html is emitted by scripts/emit-404.ts as part of the build script.
    //
    // ELK is ~1.4MB minified and there is no smaller layout engine that does
    // layered graphs properly. It never reaches the initial load: the worker
    // chunk is fetched when the graph screen mounts, and elk-runner only on the
    // main-thread fallback path. The limit is raised so the warning stays
    // meaningful for chunks we can actually do something about.
    chunkSizeWarningLimit: 1600,
  },
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
