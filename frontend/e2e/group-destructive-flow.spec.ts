import { expect, test } from '@playwright/test'

const groupId = process.env['PLAYWRIGHT_GROUP_ID']
const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const memberStorageState = process.env['PLAYWRIGHT_MEMBER_STORAGE_STATE']

test.describe('group destructive-flow UX', () => {
    test.skip(!groupId || !ownerStorageState, 'Set a disposable group ID and owner storage state to run this journey.')
    test.use({ storageState: ownerStorageState })

    test('keeps deletion confirmation in group management and redirects the legacy URL', async ({ page }) => {
        await page.goto(`/groups/${groupId}/edit`)

        await page.getByTitle('Delete group').click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('heading', { name: /Delete .+\?/ })).toBeVisible()
        await expect(dialog).toContainText('invitations')

        await dialog.getByRole('button', { name: 'Keep group' }).click()
        await expect(dialog).toBeHidden()

        await page.goto(`/groups/${groupId}/delete`)
        await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/edit$`))
    })

    test.describe('member leave flow', () => {
        test.skip(!memberStorageState, 'Set a disposable member storage state to run the member leave journey.')
        test.use({ storageState: memberStorageState })

        test('keeps leaving in the group workspace and redirects the legacy URL', async ({ page }) => {
            await page.goto(`/groups/${groupId}`)

            await page.getByRole('button', { name: 'Leave group' }).click()
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            await expect(dialog.getByRole('heading', { name: /Leave .+\?/ })).toBeVisible()
            await expect(dialog).toContainText('shared play history')

            await dialog.getByRole('button', { name: 'Keep group access' }).click()
            await expect(dialog).toBeHidden()

            await page.goto(`/groups/${groupId}/leave`)
            await expect(page).toHaveURL(new RegExp(`/groups/${groupId}$`))
        })
    })
})
