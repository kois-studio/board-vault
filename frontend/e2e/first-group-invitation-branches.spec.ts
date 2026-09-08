import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const inviteeStorageState = process.env['PLAYWRIGHT_INVITEE_STORAGE_STATE']
const inviteeUsername = process.env['PLAYWRIGHT_FIRST_GROUP_INVITEE_USERNAME']

test.describe('first-group invitation branches', () => {
    test.skip(
        !ownerStorageState || !inviteeStorageState || !inviteeUsername,
        'Set two disposable Clerk states and an existing-account invitee username.',
    )

    test('lets a recipient keep an invitation, then decline it explicitly', async ({ browser, baseURL }) => {
        const ownerContext = await browser.newContext({ storageState: ownerStorageState })
        const inviteeContext = await browser.newContext({ storageState: inviteeStorageState })
        const ownerPage = await ownerContext.newPage()
        const inviteePage = await inviteeContext.newPage()
        const groupName = `Choice ${Date.now().toString().slice(-8)}`

        try {
            await ownerPage.goto(`${baseURL}/dashboard`)
            await ownerPage.getByRole('link', { name: 'Create a group' }).first().click()
            await ownerPage.getByLabel('What should your group be called?').fill(groupName)
            await ownerPage.getByRole('button', { name: 'Create group', exact: true }).click()
            await expect(ownerPage).toHaveURL(/\/groups\/(\d+)$/)
            const groupId = ownerPage.url().match(/\/groups\/(\d+)$/)?.[1]
            expect(groupId).toBeTruthy()

            await ownerPage.goto(`${baseURL}/groups/${groupId}/edit`)
            await ownerPage.getByLabel('Their username').fill(inviteeUsername)
            await ownerPage.getByRole('button', { name: 'Send invite', exact: true }).click()
            await expect(ownerPage.getByRole('heading', { name: 'Existing account invitations' })).toBeVisible()

            await inviteePage.goto(`${baseURL}/groups`)
            const declineButton = inviteePage.getByRole('button', { name: `Decline invitation to ${groupName}` })
            await expect(declineButton).toBeVisible()
            await declineButton.click()

            const confirmation = inviteePage.getByRole('group', { name: 'Confirm invitation decline' })
            await expect(confirmation).toBeVisible()
            await confirmation.getByRole('button', { name: 'Keep it' }).click()
            await expect(confirmation).toBeHidden()
            await expect(declineButton).toBeVisible()

            await declineButton.click()
            await confirmation.getByRole('button', { name: 'Yes, decline' }).click()
            await expect(declineButton).toBeHidden()
            await expect(inviteePage.getByRole('heading', { name: 'Invitations waiting for you' })).toBeHidden()
        } finally {
            await ownerContext.close()
            await inviteeContext.close()
        }
    })
})
