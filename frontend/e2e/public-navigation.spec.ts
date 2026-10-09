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
        await expect(page.getByRole('heading', { level: 1, name: /Every game you own, on one tidy shelf/i })).toBeVisible()
        for (const step of [
            'Add a game in seconds',
            'Find the right game fast',
            'Rate what you play, wish for what’s next',
            'Share the shelf with your group',
            'Plan the night, keep the history',
        ]) {
            await expect(page.getByRole('heading', { name: step, exact: true })).toBeVisible()
        }
        await expect(page.getByRole('link', { name: 'Board Vault home' })).toBeVisible()
        const navigation = page.getByRole('navigation', { name: 'Primary navigation' })
        await expect(navigation.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/#features')
        await expect(navigation.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#how-it-works')
        await expect(navigation.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/#questions')
        await expect(page.getByText('BoardMeet', { exact: false })).toHaveCount(0)
        await expect(page.locator('a[href="#"]')).toHaveCount(0)
    })

    test('keeps the landing promise usable and truthful across viewport sizes', async ({ page }) => {
        for (const width of [375, 1280]) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/')

            await expect(page.getByRole('heading', { level: 1, name: /Every game you own/i })).toBeVisible()
            await expect(page.getByRole('link', { name: 'Create your free account' }).first()).toHaveAttribute('href', '/register')
            // The landing reads as the product; the invitation detail lives on the registration page.
            await expect(page.getByText(/beta|invit/i)).toHaveCount(0)
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        }

        // "See how it works" stays on the landing page and moves to the features.
        await page.getByRole('link', { name: 'See how it works' }).click()
        await expect(page).toHaveURL(/\/#features$/)
        await expect(page.locator('#features')).toBeInViewport()
    })

    test('filters the example shelf and shows only our own artwork', async ({ page }) => {
        await page.goto('/')

        const chips = page.getByRole('group', { name: 'Filter the example games by players' })
        await expect(page.getByText('8 games', { exact: true })).toBeVisible()
        await chips.getByRole('button', { name: '6 players' }).click()
        await expect(chips.getByRole('button', { name: '6 players' })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByText('4 games', { exact: true })).toBeVisible()
        await chips.getByRole('button', { name: 'All' }).click()
        await expect(page.getByText('8 games', { exact: true })).toBeVisible()

        // Real games in our own covers: no third-party box art on the public page.
        for (const src of await page.locator('main img').evaluateAll(images => images.map(image => image.getAttribute('src')))) {
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
        await expect(page.getByRole('heading', { level: 1, name: /Every game you own/i })).toBeVisible()
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
        await expect(page.getByRole('heading', { name: /Every game you own/i })).toHaveCount(0)
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
