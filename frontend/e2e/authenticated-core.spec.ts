import { expect, test } from '@playwright/test'

const authStorageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('authenticated core navigation', () => {
    test.skip(!authStorageState, 'Set PLAYWRIGHT_AUTH_STORAGE_STATE to a local Clerk storage-state file to run authenticated journeys.')
    test.use({ storageState: authStorageState })

    test('opens the dashboard overview', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('heading', { name: 'Your groups' })).toBeVisible()
        await expect(page.locator('body')).toContainText(/Start with the people you play with|Pick up where your group left off/i)
    })

    test('exposes working dashboard destinations', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page.getByRole('link', { name: 'Create a group', exact: true })).toHaveAttribute('href', '/create-group')
        await expect(page.getByRole('heading', { name: 'Your groups' })).toBeVisible()
        await expect(page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link')).toHaveText(['Home', 'Collection', 'Play'])
    })

    test('opens groups and collection entry points', async ({ page }) => {
        // Groups live on Home; the old URL redirects there.
        await page.goto('/groups')

        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(page.getByRole('heading', { name: 'Your groups' })).toBeVisible()

        await page.goto('/collection')

        // Collection opens on a page with one card per subpage.
        await expect(page.getByRole('heading', { name: 'Collection', level: 1 })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Add games' })).toBeVisible()
        await page.getByRole('main').getByRole('link', { name: /My Games/ }).click()
        await expect(page).toHaveURL(/\/collection\/games$/)
    })

    test('explains when a group is no longer available', async ({ page }) => {
        await page.goto('/groups/999999')

        await expect(page.getByRole('alert')).toContainText('This group is not available')
        await expect(page.getByRole('link', { name: 'Back to groups', exact: true })).toHaveAttribute('href', '/dashboard')
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
            'People',
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

        await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible()
        await expect(page.getByRole('button', { name: /Plan a session/i }).first()).toBeVisible()
    })

    test('opens completed session history', async ({ page }) => {
        await page.goto('/play/history')

        await expect(page.getByRole('heading', { name: /History/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Record a past session/i })).toBeVisible()
    })

    test('recovers from a stale history group filter', async ({ page }) => {
        await page.goto('/play/history?groupId=999999')

        await expect(page.getByRole('alert')).toContainText('That group is not available')
        await expect(page.getByRole('link', { name: 'Back to your groups', exact: true })).toHaveAttribute('href', '/dashboard')
    })

    test('opens explainable game recommendations', async ({ page }) => {
        await page.goto('/play/recommendations')

        await expect(page.getByRole('heading', { name: /(?:What should .* play|Decide what to play)/i })).toBeVisible()
        await expect(page.locator('body')).toContainText(/Create or join a group first|Who is attending\?/i)
    })
})
