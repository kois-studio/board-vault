import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { expect, type Page, test } from '@playwright/test'

// "This is me" and undoing a takeover (#278, ADR-0027), against the local API and its SQLite file:
// the owner records Carlos (a game and a finished night) and invites a member without suggesting anyone;
// the member picks Carlos on "Who are you in this group?"; the owner undoes it from Carlos's page.
const enabled = process.env['PLAYWRIGHT_THIS_IS_ME'] === '1'
const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const inviteeStorageState = process.env['PLAYWRIGHT_INVITEE_STORAGE_STATE']
const inviteeUsername = process.env['PLAYWRIGHT_INVITEE_USERNAME']
const gameTitle = process.env['PLAYWRIGHT_THIS_IS_ME_GAME_TITLE']
const databasePath = process.env['PLAYWRIGHT_THIS_IS_ME_DB_PATH']
const apiPort = process.env['PLAYWRIGHT_API_PORT']
/** Optional: a directory for screenshots of the new screens at desktop and phone widths. */
const screenshotDirectory = process.env['PLAYWRIGHT_THIS_IS_ME_SCREENSHOTS']

test.describe('"This is me" flow', () => {
    test.skip(
        !enabled || !ownerStorageState || !inviteeStorageState || !inviteeUsername || !gameTitle || !databasePath,
        'Set the explicit flag, owner and invitee states, the invitee username, a fixture game, and the local SQLite path.',
    )
    test.use({ storageState: ownerStorageState })

    test('the member picks themselves among the group people, and the owner undoes it', async ({ page, browser, baseURL }) => {
        test.setTimeout(120_000)
        const inviteeContext = await browser.newContext({ storageState: inviteeStorageState })
        const inviteePage = await inviteeContext.newPage()

        const routeBoardVaultApi = async (targetPage: Page) => {
            if (!apiPort || apiPort === '3000') return
            await targetPage.route('http://localhost:3000/**', async (route) => {
                const url = new URL(route.request().url())
                url.port = apiPort
                await route.continue({ url: url.toString() })
            })
        }
        const query = (sql: string): Array<Record<string, unknown>> => {
            const output = execFileSync('sqlite3', ['-json', databasePath as string], { input: sql, encoding: 'utf8' }).trim()
            return output ? (JSON.parse(output) as Array<Record<string, unknown>>) : []
        }
        const shoot = async (target: Page, name: string) => {
            if (!screenshotDirectory) return
            await target.screenshot({ path: join(screenshotDirectory, `${name}-desktop.png`), fullPage: true })
            const size = target.viewportSize()
            await target.setViewportSize({ width: 390, height: 844 })
            await target.screenshot({ path: join(screenshotDirectory, `${name}-phone.png`), fullPage: true })
            if (size) await target.setViewportSize(size)
        }

        try {
            await routeBoardVaultApi(page)
            await routeBoardVaultApi(inviteePage)

            // The owner's group, with two people without an account.
            await page.goto(`${baseURL}/dashboard`)
            await page.getByRole('link', { name: /Create (a|your first) group|New group/ }).first().click()
            const groupName = `Mine-${Date.now().toString().slice(-8)}`
            await page.getByLabel('What should your group be called?').fill(groupName)
            await page.getByRole('button', { name: 'Create group', exact: true }).click()
            await expect(page).toHaveURL(/\/groups\/\d+\/edit$/)
            const groupId = Number(page.url().match(/\/groups\/(\d+)\/edit$/)?.[1])
            expect(groupId).toBeGreaterThan(0)
            await page.goto(`${baseURL}/groups/${groupId}`)
            for (const displayName of ['Carlos', 'Bea']) {
                await page.getByLabel('Person name').fill(displayName)
                await page.getByRole('button', { name: 'Add person', exact: true }).click()
                await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()
            }
            const carlosCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Carlos', exact: true }) })
            await carlosCard.getByRole('button', { name: 'Edit games and preferences' }).click()
            await carlosCard.getByLabel(`${gameTitle} ownership for Carlos`).selectOption('asserted')
            await expect(carlosCard.getByLabel(`${gameTitle} ownership for Carlos`)).toBeEnabled()

            // A night Carlos came to before he had an account (recorded straight into the local file).
            const [{ id: carlosId }] = query(`SELECT id FROM GroupPerson WHERE groupId = ${groupId} AND displayName = 'Carlos';`)
            const [{ id: ownerAccountId }] = query(`SELECT createdBy AS id FROM UserGroup WHERE id = ${groupId};`)
            const [{ id: nightBefore }] = query(
                `INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone) VALUES (${groupId}, ${ownerAccountId}, '2026-10-02T19:00:00+02:00', 1, 'completed', 'Europe/Madrid') RETURNING id;`,
            )
            query(
                `INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES (${nightBefore}, ${carlosId}, 'accepted', 'attended');`,
            )

            // An invitation that suggests nobody.
            await page.goto(`${baseURL}/groups/${groupId}/edit`)
            await page.getByLabel('Their username', { exact: true }).fill(inviteeUsername ?? '')
            await page.getByRole('button', { name: 'Send invite', exact: true }).click()
            await expect(page.getByRole('region', { name: 'Pending invitations' }).getByText(inviteeUsername ?? '', { exact: true })).toBeVisible()

            // Accepting opens "Who are you in this group?" with both people, and nobody suggested.
            await inviteePage.goto(`${baseURL}/groups`)
            const accepted = inviteePage.waitForResponse((response) => /\/invitations\/\d+\/accept$/.test(response.url()) && response.ok())
            await inviteePage.getByRole('button', { name: /Accept/ }).first().click()
            await accepted
            await expect(inviteePage).toHaveURL(new RegExp(`/groups/${groupId}/people/choose$`))
            await expect(inviteePage.getByRole('heading', { level: 1, name: `Who are you in ${groupName}?` })).toBeVisible()
            const choices = inviteePage.getByTestId('choice')
            await expect(choices).toHaveCount(2)
            await expect(inviteePage.getByText('Is this you?')).toHaveCount(0)
            const carlosChoice = choices.filter({ has: inviteePage.getByRole('heading', { name: 'Carlos', exact: true }) })
            await expect(carlosChoice).toContainText(`Owns ${gameTitle}`)
            await expect(carlosChoice).toContainText('Came to 1 game night, on 2 Oct 2026')
            await expect(choices.filter({ hasText: 'Bea' })).toContainText('No game nights recorded yet')
            await shoot(inviteePage, 'choose')

            // Not chosen yet: the group page offers the same choice.
            await inviteePage.goto(`${baseURL}/groups/${groupId}`)
            await expect(inviteePage.getByTestId('choose-person-banner')).toBeVisible()
            await inviteePage.getByTestId('choose-person-banner').getByRole('link', { name: 'Find yourself' }).click()
            await expect(inviteePage).toHaveURL(new RegExp(`/groups/${groupId}/people/choose$`))

            await carlosChoice.getByRole('link', { name: 'This is me: Carlos' }).click()
            await expect(inviteePage.getByRole('heading', { name: 'Is this Carlos?' })).toBeVisible()
            await inviteePage.getByRole('button', { name: 'Save my choices and claim history' }).click()
            await expect(inviteePage.getByRole('heading', { name: 'Your choices are saved' })).toBeVisible()
            await inviteePage.getByRole('link', { name: 'Return to group' }).click()
            await expect(inviteePage).toHaveURL(new RegExp(`/groups/${groupId}$`))
            await expect(inviteePage.getByTestId('choose-person-banner')).toHaveCount(0)
            await expect(inviteePage.getByText(/\btook over Carlos\b/)).toBeVisible()
            await expect(inviteePage.getByTestId('history-undo-takeover')).toBeVisible()

            const [taken] = query(`SELECT kind, accountId FROM GroupPerson WHERE id = ${carlosId};`)
            expect(taken).toEqual(expect.objectContaining({ kind: 'linked' }))
            const inviteeAccountId = Number(taken.accountId)
            expect(query(`SELECT groupPersonId FROM GroupPersonTakeover WHERE groupId = ${groupId};`)).toEqual([{ groupPersonId: carlosId }])

            // A night the member came to after the takeover, under the same person.
            const [{ id: nightAfter }] = query(
                `INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone) VALUES (${groupId}, ${ownerAccountId}, '2026-11-06T19:00:00+01:00', 1, 'completed', 'Europe/Madrid') RETURNING id;`,
            )
            query(
                `INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES (${nightAfter}, ${carlosId}, 'accepted', 'attended');`,
            )

            // The owner sees the takeover on that person's page, and undoes it.
            // From the history line's Undo… link to the member's page, where the undo is.
            await page.goto(`${baseURL}/groups/${groupId}`)
            await expect(page.getByText(/\btook over Carlos\b/)).toBeVisible()
            await page.getByTestId('history-undo-takeover').click()
            await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/members/${inviteeAccountId}$`))
            const banner = page.getByTestId('takeover-undo')
            await expect(banner).toContainText(/took over Carlos on/)
            await shoot(page, 'person-takeover')
            await banner.getByRole('button', { name: 'Undo takeover…' }).click()
            await shoot(page, 'person-takeover-confirm')
            await banner.getByRole('button', { name: 'Yes, give Carlos back' }).click()
            await expect(page.getByText('Carlos is back as before.')).toBeVisible()
            await expect(page.getByTestId('takeover-undo')).toHaveCount(0)

            // Carlos is back without an account, with his night; the member is a new person with theirs.
            expect(query(`SELECT kind, accountId, displayName FROM GroupPerson WHERE id = ${carlosId};`)).toEqual([
                { kind: 'placeholder', accountId: null, displayName: 'Carlos' },
            ])
            const [{ id: memberPersonId }] = query(
                `SELECT id FROM GroupPerson WHERE groupId = ${groupId} AND accountId = ${inviteeAccountId} AND kind = 'linked';`,
            )
            expect(query(`SELECT meetId, groupPersonId FROM MeetPersonAttendee WHERE meetId IN (${nightBefore}, ${nightAfter}) ORDER BY meetId;`)).toEqual([
                { meetId: nightBefore, groupPersonId: carlosId },
                { meetId: nightAfter, groupPersonId: memberPersonId },
            ])
            expect(query(`SELECT gameId FROM GroupPersonGameOwnership WHERE groupPersonId = ${carlosId} AND status = 'asserted';`)).toHaveLength(1)
            expect(query(`SELECT groupPersonId FROM GroupPersonTakeover WHERE groupId = ${groupId};`)).toEqual([])
            // The member hears about it (sent after the response).
            await expect
                .poll(() => query(
                        `SELECT data FROM Notification WHERE accountId = ${inviteeAccountId} AND type = 'group_person_takeover_undone' AND json_extract(data, '$.group') = ${groupId};`,
                    ),
                )
                .toEqual([{ data: JSON.stringify({ account: Number(ownerAccountId), group: groupId, person: carlosId }) }])

            // The history says what happened, and the old line no longer offers an undo.
            await page.goto(`${baseURL}/groups/${groupId}`)
            await expect(page.getByText(/gave Carlos back to the group/)).toBeVisible()
            await expect(page.getByText(/linked Carlos to their account/)).toBeVisible()
            await expect(page.getByTestId('history-undo-takeover')).toHaveCount(0)
            await expect(page.locator('p', { hasText: /^Owned by .*\bCarlos\b/ })).toBeVisible()
        } finally {
            await inviteeContext.close()
        }
    })
})
