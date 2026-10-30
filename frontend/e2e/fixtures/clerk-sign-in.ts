import { setupClerkTestingToken } from '@clerk/testing/playwright'
import type { Page } from '@playwright/test'

/**
 * Signs a `+clerk_test` account in through the real sign-in page at `loginPath`, with the email code Clerk's test
 * addresses always accept. Needs PLAYWRIGHT_CLERK_TESTING=1. Resolves once the code is typed; the caller waits
 * for the page it expects.
 */
export async function signInWithEmailCode(page: Page, email: string, loginPath = '/login'): Promise<void> {
    await setupClerkTestingToken({ page })
    await page.goto(loginPath)
    await page.getByRole('button', { name: 'Continue with secure sign-in' }).click()
    await page.getByLabel(/email/i).first().fill(email)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    const code = page.getByRole('textbox', { name: /code|digit/i }).first()
    await code.waitFor({ timeout: 30_000 })
    // Typing before Clerk has sent the code fails with "send a code first".
    await page.waitForResponse((response) => response.url().includes('prepare_first_factor'), { timeout: 30_000 }).catch(() => undefined)
    await page.waitForTimeout(1500)
    await code.click()
    await page.keyboard.type('424242')
}
