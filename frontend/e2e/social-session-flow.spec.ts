import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const memberStorageState = process.env['PLAYWRIGHT_MEMBER_STORAGE_STATE']
const sessionId = process.env['PLAYWRIGHT_SOCIAL_SESSION_ID']
const groupName = process.env['PLAYWRIGHT_SOCIAL_GROUP_NAME']
const gameTitle = process.env['PLAYWRIGHT_SOCIAL_GAME_TITLE']

test.describe('two-account social session flow', () => {
    test.describe.configure({ timeout: 120_000 })

    test.skip(
        !ownerStorageState || !memberStorageState || !sessionId || !groupName || !gameTitle,
        'Set both Clerk storage states, the social session ID, group name, and game title against a disposable seeded environment.',
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
            await expect(memberPage.getByRole('heading', { name: /Plan for game night/i })).toBeVisible()
            const goingButton = memberPage.getByRole('button', { name: /I.m going/i })
            if (await goingButton.count()) {
                await goingButton.click()
            }
            await memberPage.reload()
            await expect(memberPage.getByRole('button', { name: /Going ✓/ })).toBeVisible()

            await ownerPage.goto(`${baseURL}${sessionPath}`)
            await ownerPage.getByRole('button', { name: 'Start game night' }).click()
            await ownerPage.reload()
            await expect(ownerPage.getByText('Live now')).toBeVisible()

            const attendanceSection = ownerPage.locator('section').filter({
                has: ownerPage.getByRole('heading', { name: 'Who actually attended?' }),
            })
            while (await attendanceSection.locator('button[aria-pressed="false"]').count()) {
                const absentCount = await attendanceSection.locator('button[aria-pressed="false"]').count()
                const absentMember = attendanceSection.locator('button[aria-pressed="false"]').first()
                await absentMember.click()
                await expect(attendanceSection.locator('button[aria-pressed="false"]')).toHaveCount(absentCount - 1)
            }
            await expect(ownerPage.getByText('2 of 2 members')).toBeVisible()

            await ownerPage.getByRole('button', { name: new RegExp(gameTitle ?? '', 'i') }).click()
            await expect(ownerPage.getByText('Played', { exact: true })).toBeVisible()
            const participantInputs = ownerPage
                .locator('fieldset')
                .filter({ hasText: 'Played by' })
                .locator('input[type="checkbox"]')
            await expect(participantInputs).toHaveCount(2)
            await expect(participantInputs.first()).toBeChecked()
            await participantInputs.first().uncheck()
            await expect(participantInputs.first()).not.toBeChecked()
            await ownerPage.getByRole('button', { name: 'Finish and save memory' }).click()
            await ownerPage.reload()
            await expect(ownerPage.getByRole('heading', { name: /Game night memory/i })).toBeVisible()

            await memberPage.goto(`${baseURL}${sessionPath}`)
            await expect(memberPage.getByText('How did it go for you?')).toBeVisible()
            await memberPage.route(`http://localhost:3000/sessions/${sessionId}`, (route) => route.abort())
            await memberPage.reload()
            await expect(memberPage.getByRole('alert')).toContainText('This session could not be loaded.')
            await memberPage.unroute(`http://localhost:3000/sessions/${sessionId}`)
            await memberPage.getByRole('button', { name: 'Retry' }).click()
            await expect(memberPage.getByRole('heading', { name: /Game night memory/i })).toBeVisible()
            await memberPage.locator(`select[aria-label*="${gameTitle}"]`).selectOption('9')
            await expect(memberPage.getByText('Your group rating was saved.')).toBeVisible()
            await memberPage.reload()

            await memberPage.goto(`${baseURL}/play/history`)
            const memoryCard = memberPage.locator('article').filter({ hasText: groupName ?? '' }).first()
            await expect(memoryCard).toBeVisible()
            await expect(memoryCard.getByText(gameTitle ?? '').first()).toBeVisible()
            await expect(memoryCard.getByRole('link', { name: 'Open session memory' })).toBeVisible()
        } finally {
            await ownerContext.close()
            await memberContext.close()
        }
    })
})
