import { expect, test } from '@playwright/test'

const authStorageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('authenticated core navigation', () => {
    test.skip(!authStorageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local Clerk storage-state file to run authenticated journeys.')
    test.use({ storageState: authStorageState })

    test('opens the dashboard overview', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('heading', { name: 'Your game groups' })).toBeVisible()
        await expect(page.getByRole('heading', { name: /Start with the people you play with/i })).toBeVisible()
    })

    test('exposes working dashboard destinations', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('link', { name: 'Create a group', exact: true })).toHaveAttribute('href', '/create-group')
        await expect(page.getByRole('link', { name: 'View invitations', exact: true })).toHaveAttribute('href', '/groups')
    })

    test('opens groups and collection entry points', async ({ page }) => {
        await page.goto('/groups')

        await expect(page.getByRole('heading', { name: /My Groups/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Create Group/i })).toBeVisible()

        await page.goto('/collection')

        await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Browse games/i }).first()).toBeVisible()
    })

    test('opens the past-session recorder', async ({ page }) => {
        await page.goto('/play/log-session')

        await expect(page.getByRole('heading', { name: /Record a past session/i })).toBeVisible()
        await expect(page.getByText(/Choose the group for this play session/i)).toBeVisible()
        await expect(page.getByRole('link', { name: /Plan a future session/i })).toHaveAttribute('href', '/play/upcoming-sessions')
    })

    test('opens upcoming sessions with a scheduling action', async ({ page }) => {
        await page.goto('/play/upcoming-sessions')

        await expect(page.getByRole('heading', { name: /Upcoming Sessions/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Plan a future session/i }).first()).toBeVisible()
    })

    test('opens completed session history', async ({ page }) => {
        await page.goto('/play/history')

        await expect(page.getByRole('heading', { name: /History/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Record a past session/i })).toBeVisible()
    })

    test('opens explainable game recommendations', async ({ page }) => {
        await page.goto('/play/recommendations')

        await expect(page.getByRole('heading', { name: /Decide what to play/i })).toBeVisible()
        await expect(page.getByRole('heading', { name: /Create or join a group first/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /Open groups/i })).toHaveAttribute('href', '/groups')
    })
})
