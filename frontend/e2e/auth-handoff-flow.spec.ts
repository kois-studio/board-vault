import { expect, type Page, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

const connecting = (page: Page) => page.getByRole('heading', { name: /Connecting you to your Board Vault/i })
const appFrame = (page: Page) => page.getByRole('link', { name: 'Board Vault home' })
const pageSkeleton = (page: Page) => page.getByTestId('page-skeleton')
const home = (page: Page) => page.getByRole('heading', { level: 1, name: /^(Hi|Welcome)\b/ })

test.describe('authenticated Clerk handoff', () => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local disposable Clerk storage-state file.')
    test.use({ storageState })

    test('shows the app frame and a page skeleton, not a blank page, while the account is confirmed (#259)', async ({ page }) => {
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

            await expect(appFrame(page)).toBeVisible({ timeout: 15_000 })
            await expect(pageSkeleton(page)).toBeVisible()
            // A quick confirmation never flashes "Connecting you…".
            await expect(connecting(page)).toHaveCount(0)
            await expect(page.locator('header [role="status"]')).toHaveCount(0)
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
            await expect(home(page)).toBeVisible({ timeout: 15_000 })
            await expect(connecting(page)).toHaveCount(0)
        }
    })

    test('shows recovery controls when local account readiness fails, then retries', async ({ page }) => {
        // The account cannot be linked this time. (A request with no answer says Board Vault can't be reached
        // instead, #238.)
        let shouldFail = true
        await page.route('**/auth/clerk/status', async (route) => {
            if (shouldFail) {
                shouldFail = false
                await route.fulfill({ json: { isValid: false } })
                return
            }

            await new Promise((resolve) => setTimeout(resolve, 1200))
            await route.continue()
        })

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

        await expect(page.getByRole('heading', { name: /We could not finish setting up your sign-in/i })).toBeVisible({ timeout: 15_000 })
        await expect(page.getByRole('alert')).toContainText(/could not finish connecting/i)
        await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()

        // The card stays on Try again instead of going back to the skeleton.
        await page.getByRole('button', { name: 'Try again', exact: true }).click()
        await expect(connecting(page)).toBeVisible({ timeout: 5_000 })
        await expect(home(page)).toBeVisible({ timeout: 15_000 })
    })

    test('says "Connecting you…" once confirming takes a while, and keeps the page asked for after a refresh', async ({ page }) => {
        await page.route('**/auth/clerk/status', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 3500))
            await route.continue()
        })

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(pageSkeleton(page)).toBeVisible({ timeout: 15_000 })
        await expect(connecting(page)).toBeVisible({ timeout: 15_000 })
        await expect(home(page)).toBeVisible({ timeout: 15_000 })

        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(connecting(page)).toBeVisible({ timeout: 15_000 })
        await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
        await expect(home(page)).toBeVisible({ timeout: 15_000 })
    })
})
