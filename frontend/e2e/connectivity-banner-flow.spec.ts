import { expect, type Page, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']
const api = /^http:\/\/localhost:3000\//
// What lets the account be known; the rest is what Home loads afterwards.
const signIn = /\/(auth\/clerk\/status|profile\/users\/\d+)(\?|$)/

const banner = (page: Page) => page.getByTestId('connectivity-banner')
const errorToasts = (page: Page) => page.locator('[aria-live="polite"] [role="alert"]')
const home = (page: Page) => page.getByRole('heading', { level: 1, name: /^(Hi|Welcome)\b/ })

/** #241: one calm notice while Board Vault cannot be reached, instead of a toast per list. */
test.describe('connectivity banner', () => {
    test.skip(!storageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local disposable Clerk storage-state file.')
    test.use({ storageState })

    test('shows one banner and no toast stack when Board Vault fails right after sign-in', async ({ page }) => {
        let down = true
        await page.route(api, (route) => (down && !signIn.test(route.request().url()) ? route.abort('failed') : route.continue()))

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

        await expect(home(page)).toBeVisible({ timeout: 15_000 })
        await expect(banner(page)).toBeVisible({ timeout: 15_000 })
        await expect(banner(page)).toContainText('We can’t reach Board Vault right now.')
        await expect(page.getByRole('status').filter({ has: banner(page) })).toHaveCount(1)
        expect(await errorToasts(page).count()).toBe(0)

        down = false
        await banner(page).getByRole('button', { name: 'Try again', exact: true }).click()
        await expect(banner(page)).toBeHidden({ timeout: 15_000 })
        expect(await errorToasts(page).count()).toBe(0)
    })

    test('appears at once when the browser goes offline, and goes away when it is back', async ({ page, context }) => {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(home(page)).toBeVisible({ timeout: 15_000 })
        await expect(banner(page)).toHaveCount(0)

        await context.setOffline(true)
        await expect(banner(page)).toBeVisible({ timeout: 2_000 })

        await context.setOffline(false)
        await expect(banner(page)).toBeHidden({ timeout: 15_000 })
    })

    test('fits a phone without scrolling sideways', async ({ page, context }) => {
        await page.setViewportSize({ width: 375, height: 800 })
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(home(page)).toBeVisible({ timeout: 15_000 })

        await context.setOffline(true)
        await expect(banner(page)).toBeVisible({ timeout: 2_000 })

        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
        await context.setOffline(false)
    })
})
