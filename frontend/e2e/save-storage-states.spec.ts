import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { signInWithEmailCode } from './fixtures/clerk-sign-in'

// Opt-in helper: signs in the local fixture accounts through the real sign-in
// page and saves their Clerk sessions for the authenticated journeys.
//   PLAYWRIGHT_SAVE_STORAGE_STATES_DIR=/tmp/bv-states PLAYWRIGHT_CLERK_TESTING=1 \
//     npx playwright test e2e/save-storage-states.spec.ts
// Writes owner.json and member.json. Never commit them.
const outputDirectory = process.env['PLAYWRIGHT_SAVE_STORAGE_STATES_DIR']

test.describe('save Clerk storage states', () => {
    test.skip(!outputDirectory, 'Set PLAYWRIGHT_SAVE_STORAGE_STATES_DIR to write fixture storage states.')

    for (const [name, email] of [
        ['owner', 'organizer+clerk_test@example.com'],
        ['member', 'member+clerk_test@example.com'],
    ] as const) {
        test(`saves the ${name} session`, async ({ page }) => {
            test.setTimeout(90_000)
            await signInWithEmailCode(page, email)

            await expect(page.getByRole('heading', { level: 1, name: /^(Hi|Welcome)\b/ })).toBeVisible({ timeout: 30_000 })
            await page.context().storageState({ path: join(outputDirectory ?? '', `${name}.json`) })
        })
    }
})
