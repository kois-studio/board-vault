import { expect, test } from '@playwright/test'

const storageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const groupId = process.env['PLAYWRIGHT_EVERYDAY_GROUP_ID']
const groupName = process.env['PLAYWRIGHT_EVERYDAY_GROUP_NAME'] ?? 'Everyday fixture'
const gameTitle = process.env['PLAYWRIGHT_EVERYDAY_GAME_TITLE'] ?? 'Borrowed Fixture'

// Run against disposable local fixtures only, with the owner's development Clerk state.
test.describe('everyday play', () => {
    test.skip(!storageState || !groupId, 'Set the owner storage state and a disposable everyday fixture group.')
    test.use({ storageState })
    test.setTimeout(90_000)

    for (const width of [1280, 390]) {
        test(`records an unowned game twice, corrects it and follows up at ${width}px`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width, height: 844 })
            await page.goto('/dashboard')
            const notice = page.getByRole('button', { name: 'Got it', exact: true })
            if (await notice.isVisible()) await notice.click()
            // Several groups: a full card each, stacked, no recording actions repeated per group, a pin on each card's corner.
            const groups = page.locator('section[aria-labelledby="groups-heading"]')
            const row = groups.locator(':scope > ul > li').filter({ hasText: groupName })
            await expect(row).toBeVisible()
            await expect(row.locator('app-card-group')).toHaveCount(1)
            await expect(row.getByRole('navigation', { name: `${groupName} shortcuts` })).toBeVisible()
            await expect(groups.getByRole('link', { name: 'Record a session' })).toHaveCount(0)
            await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true, animations: 'disabled' })
            const pin = row.getByRole('button', { name: `Pin ${groupName} to the top`, exact: true })
            if ((await pin.count()) > 0) {
                await row.hover()
                await pin.click()
            }
            await expect(row.getByRole('button', { name: `Unpin ${groupName}`, exact: true })).toBeEnabled()
            await page.reload()
            await expect(groups.locator(':scope > ul > li').first()).toContainText(groupName)
            await page.goto(`/play/log-session?groupId=${groupId}`)
            await expect(page.getByRole('button', { name: groupName, exact: true })).toHaveAttribute('aria-pressed', 'true')
            await page.getByLabel('Day', { exact: true }).fill('2026-10-03')
            await page.getByRole('button', { name: 'Everyone', exact: true }).click()
            await page.getByRole('button', { name: 'Next', exact: true }).click()
            // One search box: games nobody here owns appear under "Other games".
            await page.getByRole('searchbox', { name: 'Search the games' }).fill(gameTitle)
            const game = page.getByRole('button', { name: new RegExp(`Add ${gameTitle}`) })
            await expect(game).toBeVisible()
            await page.screenshot({ path: testInfo.outputPath(`search-${width}.png`), fullPage: true, animations: 'disabled' })
            await game.click()
            await page.getByRole('button', { name: 'Played it again', exact: true }).click()
            await page.getByRole('button', { name: 'Next', exact: true }).click()
            await page.getByLabel('Note (optional)').fill(`Everyday recording at ${width}px`)
            await expect(page.getByRole('heading', { name: 'What will be saved' })).toBeVisible()
            await page.screenshot({ path: testInfo.outputPath(`recording-${width}.png`), fullPage: true, animations: 'disabled' })
            await page.getByRole('button', { name: 'Save session', exact: true }).click()
            await expect(page.getByText('Saved to the group’s history.', { exact: true })).toBeVisible()
            // Shown once: the marker leaves the address.
            await expect(page).toHaveURL(/\/sessions\/\d+$/)
            await expect(page.getByRole('heading', { name: 'Play 2', exact: true })).toBeVisible()
            await page.getByRole('link', { name: 'Correct session', exact: true }).click()
            await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled()
            await page.getByRole('button', { name: 'Next', exact: true }).click()
            await expect(page.getByRole('group', { name: new RegExp('^Play 2 of') })).toBeVisible()
            await page.getByRole('button', { name: 'Next', exact: true }).click()
            await page.getByLabel('Note (optional)').fill(`Corrected at ${width}px`)
            await page.getByRole('button', { name: 'Save correction', exact: true }).click()
            await expect(page.getByText(`Corrected at ${width}px`, { exact: false })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Play 2', exact: true })).toBeVisible()
            const rounds = page.getByRole('list', { name: 'Individual plays' }).locator(':scope > li')
            const secondRound = rounds.nth(1)
            await secondRound.getByRole('button', { name: 'Record results', exact: true }).click()
            await secondRound.getByRole('checkbox', { name: 'Winner', exact: true }).first().check()
            await secondRound.getByRole('spinbutton').first().fill('42')
            await secondRound.getByRole('button', { name: 'Save results', exact: true }).click()
            await expect(secondRound.getByText('Score 42', { exact: true })).toBeVisible()
            const rating = page.getByRole('button', { name: `Rate 4 out of 5 stars for ${gameTitle}`, exact: true })
            if (await rating.isVisible()) await rating.click()
            if (width === 390) {
                await page.emulateMedia({ colorScheme: 'dark' })
                await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 'larger'))
            }
            await page.screenshot({ path: testInfo.outputPath(`saved-${width}.png`), fullPage: true, animations: 'disabled' })
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        })
    }

    test('starts spontaneous play without a planning detour at 320px', async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 320, height: 740 })
        await page.goto(`/play/log-session?groupId=${groupId}&mode=live`)
        await expect(page.getByRole('heading', { name: 'Start playing now', exact: true })).toBeVisible()
        await page.screenshot({ path: testInfo.outputPath('start-live-320.png'), fullPage: true, animations: 'disabled' })
        // A night already under way (an earlier run) is opened instead of starting a second one.
        const open = page.getByRole('link', { name: 'Open it', exact: true })
        if (await open.isVisible()) await open.click()
        else {
            await page.getByRole('button', { name: 'Everyone', exact: true }).click()
            await page.getByRole('button', { name: 'Start game night', exact: true }).click()
        }
        await expect(page).toHaveURL(/\/sessions\/\d+$/)
        await expect(page.getByText('Live now', { exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
})
