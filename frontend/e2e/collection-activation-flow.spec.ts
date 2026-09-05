import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_COLLECTION_STORAGE_STATE']
const searchTerm = process.env['PLAYWRIGHT_COLLECTION_GAME_SEARCH']
const gameTitle = process.env['PLAYWRIGHT_COLLECTION_GAME_TITLE']

test.describe('collection activation flow', () => {
    test.skip(
        !storageState || !searchTerm || !gameTitle,
        'Set a disposable Clerk storage state, searchable game, and exact game title.',
    )
    test.use({ storageState })

    test('adds a game, survives refresh, and prevents a duplicate', async ({ page }) => {
        await page.goto('/collection/games')
        await expect(page.getByRole('heading', { name: /Start with the games you actually bring to the table/i })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Add your first game' })).toHaveAttribute('href', '/collection/browse')

        await page.goto('/collection/browse')
        await page.locator('#game-search').fill(searchTerm)
        const addButton = page.getByRole('button', { name: new RegExp(`${gameTitle}.*to your collection`, 'i') })
        await expect(addButton).toBeEnabled()
        await addButton.click()
        await expect(page.getByText('Game added to your collection.')).toBeVisible()

        await page.reload()
        await page.locator('#game-search').fill(searchTerm)
        const ownedButton = page.getByRole('button', { name: new RegExp(`${gameTitle} is already in your collection`, 'i') })
        await expect(ownedButton).toBeDisabled()
        await page.goto('/collection/games')
        await expect(page.getByRole('heading', { name: /Your shelf is private/i })).toBeVisible()
        await expect(page.getByText(gameTitle, { exact: true })).toBeVisible()
    })
})
