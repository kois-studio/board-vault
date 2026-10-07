import { expect, test } from '@playwright/test'

test.describe('public visual regression', () => {
    // Baselines are rendered on the CI Linux runner. Font rendering differs on
    // macOS and Windows, so local runs there skip these checks. To refresh the
    // baselines, run the "Update visual baselines" workflow.
    test.skip(process.platform !== 'linux', 'Visual baselines are Linux-only')

    for (const theme of ['light', 'dark'] as const) {
        test(`keeps the landing page stable on desktop in ${theme} mode`, async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 800 })
            await page.emulateMedia({ colorScheme: theme })
            await page.goto('/')
            await expect(page.locator('app-icon svg:visible').first()).toBeVisible()

            await expect(page).toHaveScreenshot(`landing-desktop-${theme}.png`, {
                fullPage: true,
                animations: 'disabled',
                maxDiffPixels: 200,
            })
        })

        test(`keeps the landing page stable on mobile in ${theme} mode`, async ({ page }) => {
            await page.setViewportSize({ width: 390, height: 844 })
            await page.emulateMedia({ colorScheme: theme })
            await page.goto('/')
            await expect(page.locator('app-icon svg:visible').first()).toBeVisible()

            await expect(page).toHaveScreenshot(`landing-mobile-${theme}.png`, {
                fullPage: true,
                animations: 'disabled',
                maxDiffPixels: 200,
            })
        })
    }
})
