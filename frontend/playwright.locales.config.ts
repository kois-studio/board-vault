import { defineConfig, devices } from '@playwright/test'

// Browser checks that move between languages (ADR-0024). `ng serve` serves one language at the root, so these run
// against a build with every language under its prefix, served by scripts/serve-dist.mjs as Vercel serves it.
// Build first (`npm run build`), then `npm run e2e:locales`. See docs/how-to/run-with-clerk.md for the signed-in ones.
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4400'
const useExternalServer = Boolean(process.env['PLAYWRIGHT_BASE_URL'])
const useClerkTesting = process.env['PLAYWRIGHT_CLERK_TESTING'] === '1'

export default defineConfig({
    testDir: './e2e/locales',
    fullyParallel: true,
    forbidOnly: Boolean(process.env['CI']),
    retries: process.env['CI'] ? 2 : 0,
    workers: process.env['CI'] ? 1 : undefined,
    reporter: process.env['CI'] ? 'line' : 'html',
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        ...(useClerkTesting ? [{ name: 'clerk-testing-setup', testDir: './e2e', testMatch: /clerk-testing\.setup\.ts/ }] : []),
        {
            name: 'chromium',
            dependencies: useClerkTesting ? ['clerk-testing-setup'] : undefined,
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: useExternalServer
        ? undefined
        : {
              command: 'node scripts/serve-dist.mjs',
              // Its own port, even with backend/.env loaded into the shell (which sets the API's PORT).
              env: { PORT: new URL(baseURL).port },
              url: `${baseURL}/en/`,
              reuseExistingServer: false,
              timeout: 30_000,
          },
})
