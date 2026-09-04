import { expect, test } from '@playwright/test'

const authStorageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('authenticated core navigation', () => {
    test.skip(!authStorageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local Clerk storage-state file to run authenticated journeys.')
    test.use({ storageState: authStorageState })

    test('opens the dashboard overview', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('heading', { name: 'Your game groups' })).toBeVisible()
        await expect(page.getByRole('heading', { name: /Your social workspace/i })).toBeVisible()
    })

    test('exposes working dashboard destinations', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('link', { name: /Manage all groups/i })).toHaveAttribute('href', '/groups')
        await expect(page.getByRole('link', { name: /Browse the catalog/i }).first()).toHaveAttribute('href', '/collection/browse')
        await expect(page.getByRole('link', { name: /Open history/i }).first()).toHaveAttribute('href', '/play/history')
    })

    test('opens groups and collection entry points', async ({ page }) => {
        await page.goto('/groups')

        await expect(page.getByRole('heading', { name: /My Groups/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /Create Group/i })).toBeVisible()

        await page.goto('/collection')

        await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Browse games/i }).first()).toBeVisible()
    })

    test('opens the session logging wizard', async ({ page }) => {
        await page.goto('/play/log-session')

        await expect(page.getByRole('heading', { name: /Log a Session/i })).toBeVisible()
        await expect(page.getByText(/Choose the group for this play session/i)).toBeVisible()
    })

    test('opens upcoming sessions with a scheduling action', async ({ page }) => {
        await page.goto('/play/upcoming-sessions')

        await expect(page.getByRole('heading', { name: /Upcoming Sessions/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Schedule a Session/i })).toBeVisible()
    })

    test('opens completed session history', async ({ page }) => {
        await page.goto('/play/history')

        await expect(page.getByRole('heading', { name: /History/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /Log a Session/i })).toBeVisible()
    })

    test('opens explainable game recommendations', async ({ page }) => {
        await page.goto('/play/recommendations')

        await expect(page.getByRole('heading', { name: /Game Recommendations/i })).toBeVisible()
        await expect(page.getByText(/Who is attending\?/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /Recommend games/i })).toBeVisible()
    })
})
