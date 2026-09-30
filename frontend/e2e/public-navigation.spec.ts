import { expect, test } from '@playwright/test'

test.describe('public navigation', () => {
    // Pin the signed-out, invitation-only configuration CI uses, so a full local
    // backend/.env (Clerk key, self-registration) does not change what renders.
    test.beforeEach(async ({ page }) => {
        await page.route('**/runtime-config.js', route =>
            route.fulfill({
                contentType: 'text/javascript',
                body: 'globalThis.__BOARD_VAULT_RUNTIME_CONFIG__ = { clerkPublishableKey: "", selfRegistrationEnabled: false };',
            }),
        )
    })

    test('renders the public landing page', async ({ page }) => {
        await page.goto('/')

        await expect(page).toHaveTitle(/Board Vault/i)
        await expect(page.getByRole('heading', { name: /Make the next game night easier/i })).toBeVisible()
        await expect(page.getByRole('heading', { name: /Join your group|Create your account/ })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Choose the next game night' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
        const navigation = page.getByRole('navigation')
        await expect(navigation.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/#features')
        await expect(navigation.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#how-it-works')
        await expect(page.getByText('BoardMeet', { exact: false })).toHaveCount(0)
        await expect(page.locator('a[href="#"]')).toHaveCount(0)
    })

    test('keeps the landing promise usable and truthful across viewport sizes', async ({ page }) => {
        for (const width of [375, 1280]) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/')

            await expect(page.getByRole('heading', { name: /Make the next game night easier/i })).toBeVisible()
            await expect(page.getByText(/Board Vault is in private beta|Start with an invitation from a friend/i)).toBeVisible()
            await expect(page.getByText(/not a public encyclopedia of every game/i)).toBeVisible()
            await expect(page.getByRole('link', { name: /Get invited|Create an account/ }).first()).toHaveAttribute('href', '/register')
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        }
    })

    test('does not expose protected dashboard content to signed-out users', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole('heading', { name: /Make the next game night easier/i })).toBeVisible()
    })

    test('shows a not-found page for an unknown route', async ({ page }) => {
        await page.goto('/route-that-does-not-exist')

        await expect(page.getByRole('heading', { name: /page not found|404/i })).toBeVisible()
    })

    test('recognizes a Clerk invitation ticket on the registration route', async ({ page }) => {
        await page.goto('/register?__clerk_ticket=test-ticket')

        await expect(page.getByRole('heading', { name: /Join your Board Vault group/i })).toBeVisible()
        await expect(page.getByText(/secure sign-up service is still loading/i)).toBeVisible()
        await expect(page.getByLabel('Choose a username')).toBeHidden()
    })

    test('gives an existing invited account a continuation action instead of a new credential form', async ({ page }) => {
        await page.goto('/register?__clerk_ticket=test-ticket&__clerk_status=sign_in')

        await expect(page.getByRole('heading', { name: /Join your Board Vault group/i })).toBeVisible()
        await expect(page.getByText(/secure sign-up service is still loading/i)).toBeVisible()
        await expect(page.getByLabel('Choose a username')).toBeHidden()
    })
})
