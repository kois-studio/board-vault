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
        await expect(page.getByRole('heading', { name: /Game night, decided together/i })).toBeVisible()
        // The steps render when their section scrolls into view (@defer).
        await page.locator('#how-it-works').scrollIntoViewIfNeeded()
        for (const step of ['Bring your shelf', 'Plan the night', 'Decide together', 'Remember']) {
            await expect(page.getByRole('heading', { name: step, exact: true })).toBeVisible()
        }
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

            await expect(page.getByRole('heading', { name: /Game night, decided together/i })).toBeVisible()
            await expect(page.getByText(/During the beta you join with an invitation from a friend/i)).toBeVisible()
            await expect(page.getByText(/For the people you play with, not the whole internet/i)).toBeVisible()
            await expect(page.getByRole('link', { name: /Get invited|Create an account/ }).first()).toHaveAttribute('href', '/register')
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        }
    })

    test('labels every product sample as an example and keeps it out of reach', async ({ page }) => {
        await page.goto('/')
        await page.locator('#how-it-works').scrollIntoViewIfNeeded()

        const samples = page.locator('figure')
        await expect(samples).toHaveCount(5)
        for (const sample of await samples.all()) {
            await expect(sample).toContainText('Example · Friday Crew')
            await expect(sample.locator('figcaption')).toContainText('The real')
            await expect(sample.locator('[inert]')).toHaveCount(1)
        }
        // Our own artwork only: no third-party box art on the public page.
        for (const src of await page.locator('figure img').evaluateAll(images => images.map(image => image.getAttribute('src')))) {
            expect(src).toMatch(/^\/images\/landing\//)
        }
    })

    test('shows signed-out visitors only links they can use in the footer', async ({ page }) => {
        await page.goto('/')
        const footer = page.getByRole('contentinfo')

        await expect(footer.getByRole('link', { name: 'Sign in' })).toBeVisible()
        await expect(footer.getByRole('link', { name: 'Collection' })).toHaveCount(0)
        await expect(footer.getByRole('link', { name: 'Your groups' })).toHaveCount(0)
    })

    test('does not expose protected dashboard content to signed-out users', async ({ page }) => {
        await page.goto('/dashboard')

        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole('heading', { name: /Game night, decided together/i })).toBeVisible()
    })

    test('keeps the keyboard skip link on the current page', async ({ page }) => {
        await page.goto('/login')
        const skipLink = page.getByRole('link', { name: 'Skip to main content' })

        // A bare "#main-content" resolved against <base href="/"> and loaded the landing page instead.
        await expect(skipLink).toHaveAttribute('href', '/login#main-content')
        await page.keyboard.press('Tab')
        await expect(skipLink).toBeFocused()
        await page.keyboard.press('Enter')

        await expect(page).toHaveURL(/\/login#main-content$/)
        await expect(page.locator('#main-content')).toBeFocused()
        await expect(page.getByRole('heading', { name: /Game night, decided together/i })).toHaveCount(0)
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
