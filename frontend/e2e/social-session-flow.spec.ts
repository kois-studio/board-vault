import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const memberStorageState = process.env['PLAYWRIGHT_MEMBER_STORAGE_STATE']
const sessionId = process.env['PLAYWRIGHT_SOCIAL_SESSION_ID']
const groupId = process.env['PLAYWRIGHT_SOCIAL_GROUP_ID']
const groupName = process.env['PLAYWRIGHT_SOCIAL_GROUP_NAME']
const gameTitle = process.env['PLAYWRIGHT_SOCIAL_GAME_TITLE']

test.describe('two-account social session flow', () => {
    test.describe.configure({ timeout: 120_000 })

    test.skip(
        !ownerStorageState || !memberStorageState || !sessionId || !groupId || !groupName || !gameTitle,
        'Set both Clerk storage states, the social session/group IDs, group name, and game title against a disposable seeded environment.',
    )

    test('moves from RSVP to saved memory and history', async ({ browser, baseURL }) => {
        const ownerContext = await browser.newContext({ storageState: ownerStorageState })
        const memberContext = await browser.newContext({ storageState: memberStorageState })
        const ownerPage = await ownerContext.newPage()
        const memberPage = await memberContext.newPage()
        ownerPage.setDefaultTimeout(10_000)
        memberPage.setDefaultTimeout(10_000)
        ownerPage.setDefaultNavigationTimeout(15_000)
        memberPage.setDefaultNavigationTimeout(15_000)
        const sessionPath = `/sessions/${sessionId}`

        try {
            await memberPage.goto(`${baseURL}${sessionPath}`)
            await expect(memberPage.getByRole('heading', { name: /Game night/i })).toBeVisible()
            const goingButton = memberPage.getByRole('button', { name: /I.m going/i })
            if (await goingButton.count()) {
                await goingButton.click()
            }
            await memberPage.reload()
            await expect(memberPage.getByRole('button', { name: /I.m going/i })).toHaveAttribute('aria-pressed', 'true')

            await ownerPage.goto(`${baseURL}${sessionPath}`)
            await ownerPage.getByRole('button', { name: 'Start game night' }).click()
            await ownerPage.reload()
            await expect(ownerPage.getByText('Live now')).toBeVisible()

            const attendance = ownerPage.locator('aside').getByRole('button', { name: /was there/ })
            while (await attendance.and(ownerPage.locator('[aria-pressed="false"]')).count()) {
                const absentCount = await attendance.and(ownerPage.locator('[aria-pressed="false"]')).count()
                await attendance.and(ownerPage.locator('[aria-pressed="false"]')).first().click()
                await expect(attendance.and(ownerPage.locator('[aria-pressed="false"]'))).toHaveCount(absentCount - 1)
            }
            await expect(attendance.and(ownerPage.locator('[aria-pressed="true"]'))).toHaveCount(2)

            await ownerPage.getByRole('button', { name: new RegExp(gameTitle ?? '', 'i') }).click()
            const players = ownerPage.getByRole('group', { name: new RegExp(`Who played ${gameTitle}`, 'i') }).getByRole('button')
            await expect(players).toHaveCount(2)
            await expect(players.first()).toHaveAttribute('aria-pressed', 'true')
            await players.first().click()
            await expect(players.first()).toHaveAttribute('aria-pressed', 'false')

            await ownerPage.getByRole('button', { name: 'Record who won' }).click()
            await ownerPage.getByRole('button', { name: / won$/ }).first().click()
            await ownerPage.getByRole('button', { name: 'Save results' }).click()
            await expect(ownerPage.getByText('Results saved.')).toBeVisible()

            await ownerPage.getByRole('button', { name: 'Finish game night' }).first().click()
            await ownerPage.getByRole('dialog').getByRole('button', { name: 'Finish game night' }).click()
            await ownerPage.reload()
            await expect(ownerPage.getByText('Completed', { exact: true })).toBeVisible()

            await memberPage.goto(`${baseURL}${sessionPath}`)
            await expect(memberPage.getByText('How did it go for you?')).toBeVisible()
            await memberPage.route(`http://localhost:3000/sessions/${sessionId}`, (route) => route.abort())
            await memberPage.reload()
            await expect(memberPage.getByRole('alert')).toContainText('This session could not be loaded.')
            await memberPage.unroute(`http://localhost:3000/sessions/${sessionId}`)
            await memberPage.getByRole('button', { name: 'Retry' }).click()
            await expect(memberPage.getByText('Completed', { exact: true })).toBeVisible()
            await memberPage.locator(`select[aria-label*="${gameTitle}"]`).selectOption('9')
            await expect(memberPage.getByText('Your group rating was saved.')).toBeVisible()
            await memberPage.reload()

            await memberPage.goto(`${baseURL}/play/history`)
            const memoryCard = memberPage.locator('article').filter({ hasText: groupName ?? '' }).first()
            await expect(memoryCard).toBeVisible()
            await expect(memoryCard.getByText(gameTitle ?? '').first()).toBeVisible()
            await expect(memoryCard.getByText(/ won$/).first()).toBeVisible()
            await expect(memoryCard.getByRole('link', { name: /Open the session of/ })).toBeVisible()
            await memberPage.locator('#history-group-filter').selectOption({ label: groupName ?? '' })
            await expect(memberPage.getByRole('link', { name: 'What should this group play next?' })).toHaveAttribute(
                'href',
                /\/play\/recommendations\?groupId=\d+/,
            )

            await memberPage.goto(`${baseURL}/groups/${groupId}`)
            await expect(memberPage.getByRole('heading', { name: 'Games this group can play' })).toBeVisible()
            const sharedGame = memberPage.locator('article').filter({ hasText: gameTitle ?? '' }).first()
            await expect(sharedGame).toContainText('Last played')
            await memberPage.reload()
            await expect(memberPage.locator('article').filter({ hasText: gameTitle ?? '' }).first()).toContainText('Last played')
        } finally {
            await ownerContext.close()
            await memberContext.close()
        }
    })
})
