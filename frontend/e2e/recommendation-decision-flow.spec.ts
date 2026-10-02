import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_RECOMMENDATION_STORAGE_STATE']
const groupId = process.env['PLAYWRIGHT_RECOMMENDATION_GROUP_ID']
const attendeeIds = process.env['PLAYWRIGHT_RECOMMENDATION_ATTENDEE_IDS']
const gameTitle = process.env['PLAYWRIGHT_RECOMMENDATION_GAME_TITLE']

test.describe('recommendation decision flow', () => {
    test.skip(
        !storageState || !groupId || !attendeeIds || !gameTitle,
        'Set a disposable Clerk storage state, group, attendee IDs, and a game title with a recommendation candidate.',
    )
    test.use({ storageState })

    test('explains a suggestion, saves group feedback, and carries context into planning', async ({ page }) => {
        await page.goto(`/play/recommendations?groupId=${groupId}&attendeeIds=${attendeeIds}`)
        await expect(page.getByRole('heading', { name: /What should .* play\?|Decide what to play/ })).toBeVisible()

        // Suggestions load on their own and follow the chips.
        await page.getByRole('button', { name: 'Something new', exact: true }).click()

        const suggestion = page.locator('article').filter({ hasText: gameTitle }).first()
        await expect(suggestion).toBeVisible()
        await expect(suggestion).toContainText('Owned by')
        await expect(suggestion).toContainText(/Not played by this group yet|Previously played by this group/)
        const interestedButton = suggestion.getByRole('button', { name: 'Interested', exact: true })
        if ((await interestedButton.getAttribute('aria-pressed')) !== 'true') {
            await interestedButton.click()
        }

        await expect(interestedButton).toHaveAttribute('aria-pressed', 'true')

        await page.reload()
        await page.getByRole('button', { name: 'Something new', exact: true }).click()
        const refreshedSuggestion = page.locator('article').filter({ hasText: gameTitle }).first()
        await expect(refreshedSuggestion.getByRole('button', { name: 'Interested', exact: true })).toHaveAttribute('aria-pressed', 'true')

        await refreshedSuggestion.getByRole('link', { name: 'Plan with this game' }).click()
        await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/sessions/new\\?plannedGameId=\\d+&attendeeIds=${attendeeIds.replace(',', '(?:,|%2C)')}`))
    })
})
