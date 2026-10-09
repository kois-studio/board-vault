import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const inviteeStorageState = process.env['PLAYWRIGHT_INVITEE_STORAGE_STATE']
const groupId = process.env['PLAYWRIGHT_INVITATION_GROUP_ID']
const groupName = process.env['PLAYWRIGHT_INVITATION_GROUP_NAME']
const inviteeUsername = process.env['PLAYWRIGHT_INVITEE_USERNAME']

test.describe('two-account invitation flow', () => {
    test.skip(
        !ownerStorageState || !inviteeStorageState || !groupId || !groupName || !inviteeUsername,
        'Set owner/invitee Clerk states plus a fresh disposable group name/ID and invitee username.',
    )

    test('lets an owner invite and a recipient accept', async ({ browser, baseURL }) => {
        const ownerContext = await browser.newContext({ storageState: ownerStorageState })
        const inviteeContext = await browser.newContext({ storageState: inviteeStorageState })
        const ownerPage = await ownerContext.newPage()
        const inviteePage = await inviteeContext.newPage()
        const editPath = `/groups/${groupId}/edit`

        try {
            await ownerPage.goto(`${baseURL}${editPath}`)
            await ownerPage.getByLabel('Their username or email').fill(inviteeUsername)
            await ownerPage.getByRole('button', { name: 'Send invite', exact: true }).click()
            await expect(ownerPage.getByRole('heading', { name: 'Existing account invitations' })).toBeVisible()
            await expect(ownerPage.getByRole('heading', { name: 'Existing account invitations' }).locator('..').getByText(inviteeUsername, { exact: true })).toBeVisible()

            await inviteePage.goto(`${baseURL}/groups`)
            await expect(inviteePage.getByRole('heading', { name: 'Invitations waiting for you' })).toBeVisible()
            await inviteePage.reload()
            await inviteePage.getByRole('button', { name: /Accept/ }).first().click()
            await inviteePage.reload()
            await expect(inviteePage.getByRole('heading', { name: groupName })).toBeVisible()
            await expect(inviteePage.getByText(/You don't have any groups yet/)).not.toBeVisible()
        } finally {
            await ownerContext.close()
            await inviteeContext.close()
        }
    })
})
