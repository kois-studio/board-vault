import { expect, test } from '@playwright/test'

const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const memberStorageState = process.env['PLAYWRIGHT_MEMBER_STORAGE_STATE']
const sessionId = process.env['PLAYWRIGHT_SOCIAL_SESSION_ID']

test.describe('two-account social session flow', () => {
    test.skip(
        !ownerStorageState || !memberStorageState || !sessionId,
        'Set both Clerk storage states and PLAYWRIGHT_SOCIAL_SESSION_ID against a disposable seeded environment.',
    )

    test('moves from RSVP to saved memory and history', async ({ browser, baseURL }) => {
        const ownerContext = await browser.newContext({ storageState: ownerStorageState })
        const memberContext = await browser.newContext({ storageState: memberStorageState })
        const ownerPage = await ownerContext.newPage()
        const memberPage = await memberContext.newPage()
        const sessionPath = `/sessions/${sessionId}`

        try {
            await memberPage.goto(`${baseURL}${sessionPath}`)
            await expect(memberPage.getByRole('heading', { name: /Plan for game night/i })).toBeVisible()
            await memberPage.getByRole('button', { name: /I.m going/i }).click()
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

            await ownerPage.getByRole('button', { name: /Cascadia/ }).click()
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
            await memberPage.locator('select[aria-label*="Cascadia"]').selectOption('9')
            await expect(memberPage.getByText('Your group rating was saved.')).toBeVisible()
            await memberPage.reload()

            await memberPage.goto(`${baseURL}/play/history`)
            await expect(memberPage.getByText('Friday Table').first()).toBeVisible()
            await expect(memberPage.getByText('Cascadia').first()).toBeVisible()
            await expect(memberPage.getByText('Open memory').first()).toBeVisible()
        } finally {
            await ownerContext.close()
            await memberContext.close()
        }
    })
})
