import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const inviteeStorageState = process.env['PLAYWRIGHT_INVITEE_STORAGE_STATE']
const inviteeUsername = process.env['PLAYWRIGHT_FIRST_GROUP_INVITEE_USERNAME']
const groupName = process.env['PLAYWRIGHT_FIRST_GROUP_NAME']
const searchTerm = process.env['PLAYWRIGHT_FIRST_GROUP_GAME_SEARCH']
const gameTitle = process.env['PLAYWRIGHT_FIRST_GROUP_GAME_TITLE']

test.describe('first-group activation flow', () => {
    test.skip(
        !ownerStorageState || !inviteeStorageState || !inviteeUsername || !groupName || !searchTerm || !gameTitle,
        'Set two disposable Clerk states, an invitee username, a fresh group name, and an exact catalog game.',
    )

    test('connects group creation, invitation, shared shelf, recommendation, and first plan', async ({ browser, baseURL }) => {
        const ownerContext = await browser.newContext({ storageState: ownerStorageState })
        const inviteeContext = await browser.newContext({ storageState: inviteeStorageState })
        const ownerPage = await ownerContext.newPage()
        const inviteePage = await inviteeContext.newPage()

        try {
            await ownerPage.goto(`${baseURL}/dashboard`)
            await ownerPage.getByRole('link', { name: 'Create a group' }).first().click()
            await ownerPage.getByLabel('What should your group be called?').fill(groupName)
            await ownerPage.getByRole('button', { name: 'Create group' }).click()
            await expect(ownerPage).toHaveURL(/\/groups\/\d+$/)
            await expect(ownerPage.getByRole('heading', { name: new RegExp(`Make ${groupName} ready`) })).toBeVisible()

            const groupId = ownerPage.url().match(/\/groups\/(\d+)$/)?.[1]
            expect(groupId).toBeTruthy()

            await ownerPage.getByRole('link', { name: 'Invite friends' }).click()
            await ownerPage.getByLabel('Their username').fill(inviteeUsername)
            await ownerPage.getByRole('button', { name: 'Send invite', exact: true }).click()
            await expect(ownerPage.getByText('Invitation sent')).toBeVisible()

            await inviteePage.goto(`${baseURL}/groups`)
            await expect(inviteePage.getByRole('heading', { name: 'Invitations waiting for you' })).toBeVisible()
            await inviteePage.getByRole('button', { name: `Accept invitation to ${groupName}` }).click()
            await inviteePage.reload()
            await expect(inviteePage.getByRole('heading', { name: groupName })).toBeVisible()

            await ownerPage.goto(`${baseURL}/collection/browse`)
            await ownerPage.locator('#game-search').fill(searchTerm)
            const addButton = ownerPage.getByRole('button', { name: new RegExp(`${gameTitle}.*to your collection`, 'i') })
            await expect(addButton).toBeEnabled()
            await addButton.click()
            await expect(ownerPage.getByText('Game added to your collection.')).toBeVisible()

            await ownerPage.goto(`${baseURL}/groups/${groupId}`)
            await expect(ownerPage.getByRole('heading', { name: new RegExp(`Make ${groupName} ready`) })).not.toBeVisible()
            await expect(ownerPage.getByRole('heading', { name: `What should this group play?` })).toBeVisible()
            await ownerPage.getByRole('link', { name: 'Find a game' }).click()

            await expect(ownerPage.getByRole('heading', { name: `What should ${groupName} play?` })).toBeVisible()
            await ownerPage.getByLabel('Decision lens').selectOption('fresh')
            await ownerPage.getByRole('button', { name: 'Recommend games' }).click()
            const suggestion = ownerPage.locator('article').filter({ hasText: gameTitle }).first()
            await expect(suggestion).toBeVisible()
            await expect(suggestion).toContainText('Owned by')
            await suggestion.getByRole('link', { name: 'Schedule with this game' }).click()

            await expect(ownerPage).toHaveURL(new RegExp(`/groups/${groupId}/sessions/new\\?plannedGameId=\\d+`))
            await expect(ownerPage.getByRole('heading', { name: 'Plan a game night' })).toBeVisible()
            await expect(ownerPage.getByText(gameTitle, { exact: true })).toBeVisible()
            await ownerPage.getByRole('button', { name: 'Plan game night' }).click()
            await expect(ownerPage).toHaveURL(/\/play\/upcoming-sessions$/)
            await expect(ownerPage.getByText(groupName, { exact: false })).toBeVisible()

            await inviteePage.goto(`${baseURL}/groups/${groupId}`)
            await inviteePage.getByRole('button', { name: 'Leave group' }).click()
            const leaveDialog = inviteePage.getByRole('dialog')
            await expect(leaveDialog.getByRole('heading', { name: new RegExp(`Leave ${groupName}`) })).toBeVisible()
            await leaveDialog.getByRole('button', { name: 'Leave group', exact: true }).click()
            await expect(inviteePage).toHaveURL(/\/dashboard$/)
        } finally {
            await ownerContext.close()
            await inviteeContext.close()
        }
    })
})
