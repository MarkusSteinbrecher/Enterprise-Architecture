import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end harness (issue #19).
 *
 * The journeys run against the **built** app served by `vite preview`, not the
 * dev server, and on the GitHub Pages base path. That is deliberate: the two
 * things most likely to break in production and nowhere else are the base path
 * and the production bundle (workers, code-split chunks, the 404 redirect), so
 * the harness exercises exactly what Pages serves.
 */

const PORT = Number(process.env.E2E_PORT ?? 4173)

/** Must match `base` in vite.config.ts — the Pages project-site prefix. */
const BASE_PATH = '/Enterprise-Architecture/'

export const BASE_URL = `http://127.0.0.1:${PORT}${BASE_PATH}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // A test left focused locally must not silently narrow the CI run.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Two GitHub runner cores; locally Playwright picks half the cores itself.
  ...(process.env.CI ? { workers: 2 } : {}),
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    // The failure artifacts CI uploads: a trace to step through, a screenshot to
    // look at first, and a video for anything that only makes sense in motion.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // The build runs cold on CI, and ELK is a large chunk to roll up.
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
