import { join } from 'node:path'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from '@playwright/test'

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
            await setupClerkTestingToken({ page })
            await page.goto('/login')
            await page.getByRole('button', { name: 'Continue with secure sign-in' }).click()
            await page.getByLabel(/email/i).first().fill(email)
            await page.getByRole('button', { name: 'Continue', exact: true }).click()

            const code = page.getByRole('textbox', { name: /code|digit/i }).first()
            await code.waitFor({ timeout: 30_000 })
            // Typing before Clerk has sent the code fails with "send a code first".
            await page.waitForResponse((response) => response.url().includes('prepare_first_factor'), { timeout: 30_000 }).catch(() => undefined)
            await page.waitForTimeout(1500)
            await code.click()
            await page.keyboard.type('424242')

            await expect(page.getByRole('heading', { name: 'Your groups' })).toBeVisible({ timeout: 30_000 })
            await page.context().storageState({ path: join(outputDirectory ?? '', `${name}.json`) })
        })
    }
})
