import { expect, test } from '@playwright/test'

// Signed out, the header's language menu moves to the same page in another language and remembers the choice
// in the `bv_lang` cookie (#185, ADR-0024). serve-dist.mjs serves the menu in preview mode, so every supported
// language is listed.
test.describe('choosing a language signed out', () => {
    test('moves the landing to Spanish and remembers it', async ({ page, context }) => {
        await page.goto('/en/')
        await expect(page.locator('html')).toHaveAttribute('lang', 'en')
        await expect(page.getByRole('heading', { level: 1, name: /Every game you own, on one tidy shelf/i })).toBeVisible()

        await page.getByRole('button', { name: 'Language: English' }).click()
        const languages = page.getByRole('list', { name: 'Choose a language' })
        for (const name of ['English', 'Español', 'Français', 'Deutsch', 'Italiano']) {
            await expect(languages.getByText(name, { exact: true })).toBeVisible()
        }
        await expect(languages.locator('[aria-current="true"]')).toHaveText('English')
        await languages.getByRole('link', { name: 'Español' }).click()

        await expect(page).toHaveURL(/\/es\/$/)
        await expect(page.locator('html')).toHaveAttribute('lang', 'es')
        await expect(page.getByRole('heading', { level: 1, name: /Todos tus juegos, en una estantería ordenada/i })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Idioma: Español' })).toBeVisible()
        // An address without a prefix follows the cookie once the language is offered; locales.spec.ts covers that rule.
        expect((await context.cookies()).find((cookie) => cookie.name === 'bv_lang')?.value).toBe('es')
    })

    test('keeps the page and its query when switching', async ({ page }) => {
        await page.goto('/en/login?redirect=%2Fcollection')

        await page.getByRole('button', { name: 'Language: English' }).click()
        await page.getByRole('list', { name: 'Choose a language' }).getByRole('link', { name: 'Deutsch' }).click()

        await expect(page).toHaveURL(/\/de\/login\?redirect=%2Fcollection$/)
        await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    })
})
