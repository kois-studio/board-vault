import { expect, test } from '@playwright/test'

test.describe('public visual regression', () => {
    for (const theme of ['light', 'dark'] as const) {
        test(`keeps the landing page stable on desktop in ${theme} mode`, async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 800 })
            await page.emulateMedia({ colorScheme: theme })
            await page.goto('/')
            await expect(page.locator('app-icon svg').first()).toBeVisible()
            await page.waitForTimeout(250)

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
            await expect(page.locator('app-icon svg').first()).toBeVisible()
            await page.waitForTimeout(250)

            await expect(page).toHaveScreenshot(`landing-mobile-${theme}.png`, {
                fullPage: true,
                animations: 'disabled',
                maxDiffPixels: 200,
            })
        })
    }
})
