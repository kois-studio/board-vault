import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('settings security UX', () => {
    test.skip(!storageState, 'Set a disposable Clerk storage state to run the settings security journey.')
    test.use({ storageState })

    test('keeps security actions truthful and settings navigation semantic', async ({ page }) => {
        await page.goto('/settings/security')

        const sections = page.getByRole('navigation', { name: 'Settings sections' })
        await expect(sections.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings/profile')
        await expect(sections.getByRole('link', { name: 'Appearance' })).toHaveAttribute('href', '/settings/appearance')
        await expect(sections.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page')
        await expect(page.getByRole('heading', { name: 'Delete account' })).toBeVisible()
        await expect(page.getByText(/Self-service deletion is not enabled yet/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /Not available yet/i })).toHaveCount(0)
    })

    test('keeps the old account address working', async ({ page }) => {
        await page.goto('/settings/account')

        await expect(page).toHaveURL(/\/settings\/profile$/)
        await expect(page.getByRole('heading', { name: 'Profile', level: 2 })).toBeVisible()
    })
})
