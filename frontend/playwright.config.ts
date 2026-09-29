import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4300'
const useExternalServer = Boolean(process.env['PLAYWRIGHT_BASE_URL'])
const useClerkTesting = process.env['PLAYWRIGHT_CLERK_TESTING'] === '1'

const chromiumProject = {
    name: 'chromium',
    testIgnore: useClerkTesting ? undefined : /clerk-testing\.setup\.ts/,
    dependencies: useClerkTesting ? ['clerk-testing-setup'] : undefined,
    use: { ...devices['Desktop Chrome'] },
}

export default defineConfig({
    testDir: './e2e',
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
    projects: useClerkTesting
        ? [
              {
                  name: 'clerk-testing-setup',
                  testMatch: /clerk-testing\.setup\.ts/,
              },
              chromiumProject,
          ]
        : [chromiumProject],
    webServer: useExternalServer
        ? undefined
        : {
              command: 'npm run start -- --host 127.0.0.1 --port 4300',
              // Match CI instead of the contributor's backend/.env, which enables self-registration locally.
              env: { BOARD_VAULT_SELF_REGISTRATION_ENABLED: 'false' },
              url: baseURL,
              reuseExistingServer: false,
              timeout: 120_000,
          },
})
