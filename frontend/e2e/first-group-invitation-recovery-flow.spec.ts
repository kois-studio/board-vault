import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']

test.describe('first-group invitation recovery flow', () => {
    test.skip(!ownerStorageState, 'Set a disposable owner Clerk storage state.')

    test('keeps a new-person email available after provider failure and retries', async ({ browser, baseURL }) => {
        const context = await browser.newContext({ storageState: ownerStorageState })
        const page = await context.newPage()
        const suffix = Date.now().toString().slice(-8)
        const groupName = `Email ${suffix}`
        const email = `boardvault-${suffix}@example.com`
        let postAttempts = 0

        await page.route(/\/groups\/\d+\/clerk-invitations$/, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.continue()
                return
            }

            postAttempts += 1
            if (postAttempts === 1) {
                await route.fulfill({
                    status: 502,
                    contentType: 'application/json',
                    body: JSON.stringify({ statusCode: 502, code: 'CLERK_PROVIDER_UNAVAILABLE', message: 'Temporary provider failure' }),
                })
                return
            }

            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    invitationId: 'inv_local_recovery',
                    emailAddress: email,
                    url: 'https://example.com/register?__clerk_ticket=local-recovery-ticket',
                }),
            })
        })

        try {
            await page.goto(`${baseURL}/dashboard`)
            await page.getByRole('link', { name: 'Create a group' }).first().click()
            await page.getByLabel('What should your group be called?').fill(groupName)
            await page.getByRole('button', { name: 'Create group', exact: true }).click()
            await expect(page).toHaveURL(/\/groups\/\d+\/edit$/)
            const groupId = page.url().match(/\/groups\/(\d+)\/edit$/)?.[1]
            expect(groupId).toBeTruthy()

            await page.goto(`${baseURL}/groups/${groupId}/edit`)
            const emailInput = page.getByLabel('Their username or email')
            await emailInput.fill(email)
            const inviteButton = page.getByRole('button', { name: 'Send invite', exact: true })
            await inviteButton.click()

            await expect(page.getByRole('alert')).toContainText('could not send the email invitation')
            await expect(emailInput).toHaveValue(email)
            await expect(inviteButton).toBeEnabled()

            await inviteButton.click()
            await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible()
            await expect(emailInput).toHaveValue('')
        } finally {
            await context.close()
        }
    })
})
