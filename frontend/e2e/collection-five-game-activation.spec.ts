import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_COLLECTION_STORAGE_STATE']
const titles = (process.env['PLAYWRIGHT_COLLECTION_GAME_TITLES'] ?? '')
    .split(',')
    .map((title) => title.trim())
    .filter(Boolean)

test.describe('five-game collection activation', () => {
    test.skip(
        !storageState || titles.length < 5,
        'Set a disposable Clerk storage state and five comma-separated fixture game titles.',
    )
    test.use({ storageState })

    test('reaches the collection-ready handoff after five games', async ({ page }) => {
        for (const title of titles.slice(0, 5)) {
            await page.goto('/collection/browse')
            await page.locator('#game-search').fill(title)

            const addButton = page.getByRole('button', { name: new RegExp(`${title}.*to your collection`, 'i') })
            const ownedButton = page.getByRole('button', { name: new RegExp(`${title} is already in your collection`, 'i') })
            await expect(page.getByText(title, { exact: true })).toBeVisible()
            await expect(addButton.or(ownedButton)).toBeVisible()

            if (await addButton.isVisible()) {
                await expect(addButton).toBeEnabled()
                await addButton.click()
                await expect(page.getByText('Game added to your collection.')).toBeVisible()
            } else {
                await expect(ownedButton).toBeDisabled()
            }
        }

        await page.goto('/collection/games')
        await expect(page.getByRole('heading', { name: 'My Games' })).toBeVisible()
        await expect(page.getByText(/^\d+ games$/)).toBeVisible()
    })
})
