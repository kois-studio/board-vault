import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_ACQUISITION_STORAGE_STATE']
const groupId = process.env['PLAYWRIGHT_ACQUISITION_GROUP_ID']
const gameTitle = process.env['PLAYWRIGHT_ACQUISITION_GAME_TITLE']

test.describe('group acquisition decision flow', () => {
    test.skip(
        !storageState || !groupId || !gameTitle,
        'Set a disposable owner Clerk storage state, group, and unowned acquisition candidate title.',
    )
    test.use({ storageState })

    test('lets the owner resolve and reopen a social acquisition candidate', async ({ page }) => {
        await page.goto(`/groups/${groupId}`)
        const candidate = page.locator('article').filter({ hasText: gameTitle }).filter({ hasText: 'interested' }).first()
        await expect(candidate).toBeVisible()
        const reopenButton = candidate.getByRole('button', { name: 'Reopen' })
        if (await reopenButton.count()) {
            await reopenButton.click()
        }
        await expect(candidate).toContainText('Open for discussion')

        await candidate.getByRole('button', { name: 'Plan to acquire' }).click()
        await expect(candidate).toContainText('Last decision by')
        await page.reload()
        await expect(page.locator('article').filter({ hasText: gameTitle }).first()).toContainText('Plan to acquire')

        const refreshedCandidate = page.locator('article').filter({ hasText: gameTitle }).filter({ hasText: 'Plan to acquire' }).first()
        await refreshedCandidate.getByRole('button', { name: 'Not now' }).click()
        await expect(refreshedCandidate).toContainText('Not now')
        await page.reload()
        const postponedCandidate = page.locator('article').filter({ hasText: gameTitle }).filter({ hasText: 'Not now' }).first()
        await expect(postponedCandidate).toContainText('Last decision by')

        await postponedCandidate.getByRole('button', { name: 'Reopen' }).click()
        await expect(postponedCandidate).toContainText('Open for discussion')
    })
})
