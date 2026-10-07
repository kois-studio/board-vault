import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_AUTH_STORAGE_STATE']

test.describe('settings account UX', () => {
    test.skip(!storageState, 'Set a disposable Clerk storage state to run the settings account journey.')
    test.use({ storageState })

    test('shows sign-in details and asks before deleting', async ({ page }) => {
        await page.goto('/settings/account')

        const sections = page.getByRole('navigation', { name: 'Settings sections' })
        await expect(sections.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings/profile')
        await expect(sections.getByRole('link', { name: 'Appearance' })).toHaveAttribute('href', '/settings/appearance')
        await expect(sections.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page')
        await expect(page.getByTestId('account-username')).not.toBeEmpty()
        await expect(page.getByRole('button', { name: 'Manage sign-in' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Delete account' })).toBeVisible()
        await expect(page.getByText(/can't be undone/i).first()).toBeVisible()

        // Opening the confirmation and backing out deletes nothing: the storage state stays usable.
        await page.getByTestId('delete-account').click()
        const dialog = page.getByRole('dialog', { name: 'Delete your account?' })
        await expect(dialog.getByTestId('confirm-delete-account')).toBeDisabled()
        await dialog.getByRole('button', { name: 'Keep my account' }).click()
        await expect(dialog).toHaveCount(0)
    })

    test('keeps the old security address working', async ({ page }) => {
        await page.goto('/settings/security')

        await expect(page).toHaveURL(/\/settings\/account$/)
        await expect(page.getByRole('heading', { name: 'Account', level: 2 }).first()).toBeVisible()
        await expect(page.getByRole('region', { name: 'Sign-in' })).toBeVisible()
    })

    test('shows the username read-only on the profile', async ({ page }) => {
        await page.goto('/settings/profile')

        await expect(page.getByTestId('profile-username')).not.toBeEmpty()
        await expect(page.getByRole('textbox', { name: 'Username' })).toHaveCount(0)
        await expect(page.getByRole('region', { name: 'Username' }).getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/settings/account')
    })
})
