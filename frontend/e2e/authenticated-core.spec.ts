import { expect, test } from '@playwright/test'

const authStorageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('authenticated core navigation', () => {
    test.skip(!authStorageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local Clerk storage-state file to run authenticated journeys.')
    test.use({ storageState: authStorageState })

    test('opens the dashboard overview', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('heading', { name: 'Your game groups' })).toBeVisible()
        await expect(page.locator('body')).toContainText(/Start with the people you play with|Pick up where your group left off/i)
    })

    test('exposes working dashboard destinations', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('link', { name: 'Create a group', exact: true })).toHaveAttribute('href', '/create-group')
        await expect(page.locator('a[href="/groups"]').first()).toBeVisible()
    })

    test('opens groups and collection entry points', async ({ page }) => {
        await page.goto('/groups')

        await expect(page.getByRole('heading', { name: /My Groups/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Create Group/i })).toBeVisible()

        await page.goto('/collection')

        await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Browse games/i }).first()).toBeVisible()
    })

    test('explains when a group is no longer available', async ({ page }) => {
        await page.goto('/groups/999999')

        await expect(page.getByRole('alert')).toContainText('This group is not available')
        await expect(page.getByRole('link', { name: 'Back to groups', exact: true })).toHaveAttribute('href', '/groups')
    })

    test('gives image-only group game links accessible names', async ({ page }) => {
        const groupId = process.env['PLAYWRIGHT_GROUP_ID']
        test.skip(!groupId, 'Set PLAYWRIGHT_GROUP_ID to a disposable local group to run the rendered group accessibility check.')

        await page.setViewportSize({ width: 375, height: 900 })
        await page.goto(`/groups/${groupId}`)

        const documentWidth = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
        expect(documentWidth.document).toBeLessThanOrEqual(documentWidth.viewport)

        const gameLinks = page.locator('a[href^="/games/"]')
        await expect(gameLinks.first()).toBeVisible()
        await expect(gameLinks.first()).toHaveAttribute('aria-label', /^View /)

        await expect(page.getByRole('navigation', { name: 'Group workspace areas' }).locator('a')).toHaveText([
            'Decide',
            'Games to acquire',
            'Sessions',
            'Group library',
            'History & insights',
        ])

        await page.goto('/play/history')
        const historyGameLinks = page.locator('a[href^="/games/"]')
        if (await historyGameLinks.count()) {
            await expect(historyGameLinks.first()).toHaveAccessibleName(/^View /)
        }
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

    test('recovers from a stale history group filter', async ({ page }) => {
        await page.goto('/play/history?groupId=999999')

        await expect(page.getByRole('alert')).toContainText('That group is not available')
        await expect(page.getByRole('link', { name: 'Back to your groups', exact: true })).toHaveAttribute('href', '/groups')
    })

    test('opens explainable game recommendations', async ({ page }) => {
        await page.goto('/play/recommendations')

        await expect(page.getByRole('heading', { name: /Decide what to play/i })).toBeVisible()
        await expect(page.locator('body')).toContainText(/Create or join a group first|Who is attending\?/i)
    })
})
