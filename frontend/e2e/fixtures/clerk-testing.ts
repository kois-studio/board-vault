import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base, expect } from '@playwright/test'

/**
 * Opt-in fixture for browser flows that need Clerk bot protection bypassed.
 * The Playwright project must be run with PLAYWRIGHT_CLERK_TESTING=1 so the
 * short-lived token is initialized by clerk-testing.setup.ts first.
 */
export const test = base.extend({
    context: async ({ context }, use) => {
        await setupClerkTestingToken({ context })
        await use(context)
    },
})

export { expect }
