import { type Browser, expect, type Page, test } from '@playwright/test'
import { signInWithEmailCode } from '../fixtures/clerk-sign-in'

// Signed in, choosing a language in Settings saves it on the account, and signing in on another browser opens
// the app in that language once (#185, ADR-0024). It needs a development build with every language, served with
// the build's own runtime config, and the local API; docs/how-to/run-with-clerk.md#language-switching lists the steps.
// It changes the account's language and puts it back to English at the end.
const email = process.env['PLAYWRIGHT_LOCALES_SIGN_IN_EMAIL']

/** A page that fails the test on any request to the production API: these runs must use the local one. */
async function localOnlyPage(browser: Browser): Promise<Page> {
    const page = await (await browser.newContext()).newPage()
    await page.route(/^https:\/\/backend\.board-vault\.com\//, (route) => {
        void route.abort()
        throw new Error('This build talks to the production API; build with --configuration=development --localize.')
    })
    return page
}

async function chooseInSettings(page: Page, prefix: string, language: string): Promise<void> {
    await page.goto(`/${prefix}/settings/language`)
    await page.getByRole('group', { name: /^(Language|Idioma)$/ }).getByText(language, { exact: true }).click()
}

test.describe.serial('choosing a language signed in', () => {
    test.skip(!email || process.env['PLAYWRIGHT_CLERK_TESTING'] !== '1', 'Set PLAYWRIGHT_LOCALES_SIGN_IN_EMAIL and PLAYWRIGHT_CLERK_TESTING=1.')
    test.setTimeout(120_000)

    test('Settings moves to the chosen language and saves it on the account', async ({ browser }) => {
        const page = await localOnlyPage(browser)
        await signInWithEmailCode(page, email ?? '', '/en/login')
        await expect(page.getByRole('heading', { level: 1, name: /^(Hi|Welcome)\b/ })).toBeVisible({ timeout: 30_000 })

        const saved = page.waitForResponse((response) => response.request().method() === 'PUT' && /\/users\/\d+$/.test(response.url()))
        await chooseInSettings(page, 'en', 'Español')
        expect((await saved).ok()).toBe(true)

        await expect(page).toHaveURL(/\/es\/settings\/language$/)
        await expect(page.locator('html')).toHaveAttribute('lang', 'es')
        await expect(page.getByRole('heading', { level: 2, name: 'Idioma' })).toBeVisible()
        await expect(page.getByRole('radio', { name: 'Español' })).toBeChecked()
        await page.context().close()
    })

    test('signing in elsewhere opens the account’s language once, and English puts it back', async ({ browser }) => {
        const page = await localOnlyPage(browser)
        await signInWithEmailCode(page, email ?? '', '/en/login')

        await expect(page).toHaveURL(/\/es\//, { timeout: 30_000 })
        await expect(page.locator('html')).toHaveAttribute('lang', 'es')

        // Choosing again within the session is not undone by the account's language.
        await chooseInSettings(page, 'es', 'English')
        await expect(page).toHaveURL(/\/en\/settings\/language$/)
        await expect(page.getByRole('heading', { level: 2, name: 'Language' })).toBeVisible()
        await page.reload()
        await expect(page).toHaveURL(/\/en\/settings\/language$/)
        await page.context().close()
    })
})
