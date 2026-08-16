import { expect, test } from '@playwright/test'

test.describe('public navigation', () => {
    test('renders the public landing page', async ({ page }) => {
        await page.goto('/')

        await expect(page).toHaveTitle(/Board Vault|BoardMeet/i)
        await expect(page.getByRole('heading', { name: /Find the Perfect Board Game/i })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    })

    test('does not expose protected dashboard content to signed-out users', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole('heading', { name: /Find the Perfect Board Game/i })).toBeVisible()
    })

    test('shows a not-found page for an unknown route', async ({ page }) => {
        await page.goto('/route-that-does-not-exist')

        await expect(page.getByRole('heading', { name: /page not found|404/i })).toBeVisible()
    })
})
