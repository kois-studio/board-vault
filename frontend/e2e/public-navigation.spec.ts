import { expect, test } from '@playwright/test'

test.describe('public navigation', () => {
    test('renders the public landing page', async ({ page }) => {
        await page.goto('/')

        await expect(page).toHaveTitle(/Board Vault/i)
        await expect(page.getByRole('heading', { name: /Keep your group’s games close/i })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
        const navigation = page.getByRole('navigation')
        await expect(navigation.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/#features')
        await expect(navigation.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#how-it-works')
        await expect(page.getByText('BoardMeet', { exact: false })).toHaveCount(0)
        await expect(page.locator('a[href="#"]')).toHaveCount(0)
    })

    test('does not expose protected dashboard content to signed-out users', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole('heading', { name: /Keep your group’s games close/i })).toBeVisible()
    })

    test('shows a not-found page for an unknown route', async ({ page }) => {
        await page.goto('/route-that-does-not-exist')

        await expect(page.getByRole('heading', { name: /page not found|404/i })).toBeVisible()
    })
})
