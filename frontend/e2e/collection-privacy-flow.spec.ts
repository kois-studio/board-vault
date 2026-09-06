import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const memberStorageState = process.env['PLAYWRIGHT_MEMBER_STORAGE_STATE']
const ownerOnlyGame = process.env['PLAYWRIGHT_OWNER_PRIVATE_GAME_TITLE']
const memberOnlyGame = process.env['PLAYWRIGHT_MEMBER_PRIVATE_GAME_TITLE']

test.describe('private collection boundary', () => {
    test.skip(
        !ownerStorageState || !memberStorageState || !ownerOnlyGame || !memberOnlyGame,
        'Set owner/member Clerk states and one private-only title for each disposable account.',
    )

    test('keeps personal shelves separate while group context stays shared', async ({ browser }) => {
        const ownerContext = await browser.newContext({ storageState: ownerStorageState })
        const ownerPage = await ownerContext.newPage()
        await ownerPage.goto('/collection/games')
        await expect(ownerPage.getByRole('heading', { name: 'Your shelf is private until you use it in a group decision.' })).toBeVisible()
        await expect(ownerPage.getByText(ownerOnlyGame!, { exact: true })).toBeVisible()
        await expect(ownerPage.getByText(memberOnlyGame!, { exact: true })).toHaveCount(0)

        const memberContext = await browser.newContext({ storageState: memberStorageState })
        const memberPage = await memberContext.newPage()
        await memberPage.goto('/collection/games')
        await expect(memberPage.getByRole('heading', { name: 'Your shelf is private until you use it in a group decision.' })).toBeVisible()
        await expect(memberPage.getByText(memberOnlyGame!, { exact: true })).toBeVisible()
        await expect(memberPage.getByText(ownerOnlyGame!, { exact: true })).toHaveCount(0)

        await ownerContext.close()
        await memberContext.close()
    })
})
