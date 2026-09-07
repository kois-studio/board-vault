import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('authenticated Clerk handoff', () => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local disposable Clerk storage-state file.')
    test.use({ storageState })

    test('keeps the handoff visible while local account readiness is delayed', async ({ page }) => {
        await page.route('**/auth/clerk/status', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1200))
            await route.continue()
        })

        for (const viewport of [
            { width: 375, height: 900 },
            { width: 1280, height: 900 },
        ]) {
            await page.setViewportSize(viewport)
            await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

            await expect(page.getByRole('heading', { name: /Connecting you to your Board Vault/i })).toBeVisible({ timeout: 15_000 })
            await expect(page.locator('header [role="status"]')).toHaveCount(0)
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
            await expect(page.getByRole('heading', { name: 'Your game groups' })).toBeVisible({ timeout: 15_000 })
        }
    })
})
