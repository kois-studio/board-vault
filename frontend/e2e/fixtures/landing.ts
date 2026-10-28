import { expect, type Page } from '@playwright/test'

/**
 * The landing builds each feature sample only when it comes near the screen (`@defer (on viewport)`), so a
 * check that reads them, or a full-page screenshot, scrolls past every feature row first. It ends back at the top.
 */
export async function showLandingSamples(page: Page): Promise<void> {
    for (const row of await page.locator('#features > div > div').all()) {
        await row.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
        await expect(row.locator('[data-landing-placeholder]')).toHaveCount(0)
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}
