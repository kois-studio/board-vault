import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']

test.describe('first-group recovery flow', () => {
    test.skip(!ownerStorageState, 'Set a disposable owner Clerk storage state.')

    test('explains a temporary group-creation failure and keeps the journey retryable', async ({ browser, baseURL }) => {
        const context = await browser.newContext({ storageState: ownerStorageState })
        const page = await context.newPage()
        let shouldFail = true
        const groupName = `Retry ${Date.now().toString().slice(-8)}`

        await page.route(/\/dashboard\/users\/\d+\/groups\/create\//, async (route) => {
            if (shouldFail && route.request().method() === 'POST') {
                shouldFail = false
                await route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({ statusCode: 503, code: 'TEMPORARY_FAILURE', message: 'Temporary test failure' }),
                })
                return
            }
            await route.continue()
        })

        try {
            await page.goto(`${baseURL}/dashboard`)
            await page.getByRole('link', { name: 'Create a group' }).first().click()
            await page.getByLabel('What should your group be called?').fill(groupName)
            const createButton = page.getByRole('button', { name: 'Create group', exact: true })

            await createButton.click()
            await expect(page.getByRole('alert')).toContainText('could not create the group')
            await expect(createButton).toBeEnabled()

            await createButton.click()
            await expect(page).toHaveURL(/\/groups\/\d+$/)
            await expect(page.getByRole('heading', { name: groupName, exact: true })).toBeVisible()
        } finally {
            await context.close()
        }
    })
})
