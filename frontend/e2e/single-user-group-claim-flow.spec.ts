import { execFileSync } from 'node:child_process'

import { expect, test } from '@playwright/test'

const enabled = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_CLAIM'] === '1'
const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
// An invitee who already has an account: people are invited by username only (#277).
const inviteeStorageState = process.env['PLAYWRIGHT_INVITEE_STORAGE_STATE']
const inviteeUsername = process.env['PLAYWRIGHT_INVITEE_USERNAME']
const gameTitle = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_GAME_TITLE']
const databasePath = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_DB_PATH']
const apiPort = process.env['PLAYWRIGHT_API_PORT']

test.describe('single-user group claim flow', () => {
    test.skip(
        !enabled || !ownerStorageState || !inviteeStorageState || !inviteeUsername || !gameTitle || !databasePath,
        'Set the explicit flag, owner and invitee states, the invitee username, a fixture game, and the local SQLite path.',
    )
    test.use({ storageState: ownerStorageState })

    test('creates group people, configures one, and verifies the registered invitee claim in SQLite', async ({ page, browser, baseURL }) => {
        const inviteeContext = await browser.newContext({ storageState: inviteeStorageState })
        const inviteePage = await inviteeContext.newPage()

        const routeBoardVaultApi = async (targetPage: typeof page) => {
            if (!apiPort || apiPort === '3000') return

            await targetPage.route('http://localhost:3000/**', async (route) => {
                const url = new URL(route.request().url())
                url.port = apiPort
                await route.continue({ url: url.toString() })
            })
        }

        const queryDatabase = (sql: string): Array<Record<string, unknown>> => {
            const output = execFileSync('sqlite3', ['-json', databasePath as string], { input: sql, encoding: 'utf8' }).trim()
            return output ? (JSON.parse(output) as Array<Record<string, unknown>>) : []
        }

        try {
            await routeBoardVaultApi(page)
            await routeBoardVaultApi(inviteePage)

            await page.goto(`${baseURL}/dashboard`)
            await page.getByRole('link', { name: /Create (a|your first) group|New group/ }).first().click()
            const groupName = `Phantom-${Date.now().toString().slice(-8)}`
            await page.getByLabel('What should your group be called?').fill(groupName)
            await page.getByRole('button', { name: 'Create group', exact: true }).click()
            await expect(page).toHaveURL(/\/groups\/\d+\/edit$/)
            const groupId = page.url().match(/\/groups\/(\d+)\/edit$/)?.[1]
            expect(groupId).toBeTruthy()
            await page.goto(`${baseURL}/groups/${groupId}`)

            for (const displayName of ['Ana', 'example-member', 'Carla']) {
                await page.getByLabel("Person name").fill(displayName)
                await page.getByRole('button', { name: 'Add person', exact: true }).click()
                await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()
            }

            const anaCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Ana', exact: true }) })
            const ownershipButton = anaCard.getByRole('button', { name: new RegExp(`not recorded ownership for ${gameTitle}`, 'i') })
            await ownershipButton.click()
            await expect(anaCard.getByRole('button', { name: new RegExp(`asserted ownership for ${gameTitle}`, 'i') })).toBeVisible()

            const preferenceButton = anaCard.getByRole('button', { name: `Preference for ${gameTitle}` })
            await preferenceButton.click()
            await preferenceButton.click()
            await expect(preferenceButton).toContainText('favorite')

            await page.goto(`${baseURL}/groups/${groupId}/edit`)
            const claimPersonSelect = page.getByLabel('Are they someone already in this group?')
            await claimPersonSelect.selectOption({ label: 'Yes, they are Ana' })
            await page.getByLabel('Their username', { exact: true }).fill(inviteeUsername ?? '')
            await page.getByRole('button', { name: 'Send invite', exact: true }).click()
            await expect(page.getByRole('region', { name: 'Pending invitations' }).getByText(inviteeUsername ?? '', { exact: true })).toBeVisible()

            await inviteePage.goto(`${baseURL}/groups`)
            await expect(inviteePage.getByRole('heading', { name: 'Invitations waiting for you' })).toBeVisible()
            const accepted = inviteePage.waitForResponse((response) => /\/invitations\/\d+\/accept$/.test(response.url()) && response.ok())
            await inviteePage.getByRole('button', { name: /Accept/ }).first().click()
            await accepted
            await inviteePage.goto(`${baseURL}/groups/${groupId}`)
            await expect(inviteePage.getByText('A group person is waiting for you')).toBeVisible()
            await inviteePage.getByRole('link', { name: 'Review and claim' }).click()
            await expect(inviteePage.getByRole('heading', { name: 'Is this Ana?' })).toBeVisible()

            const reviewCheckboxes = inviteePage.getByRole('checkbox')
            await expect(reviewCheckboxes).toHaveCount(3)
            await reviewCheckboxes.nth(1).uncheck()
            await reviewCheckboxes.nth(2).check()
            await inviteePage.getByRole('button', { name: 'Yes, claim this history' }).click()
            await expect(inviteePage).toHaveURL(new RegExp(`/groups/${groupId}$`))
            await expect(inviteePage.getByRole('heading', { name: 'Ana', exact: true }).locator('..')).toContainText('Account linked')

            const groupPersonRows = queryDatabase(
                `SELECT id, accountId, kind FROM GroupPerson WHERE groupId = ${Number(groupId)} AND displayName = 'Ana';`,
            )
            expect(groupPersonRows).toHaveLength(1)
            expect(groupPersonRows[0]).toEqual(expect.objectContaining({ kind: 'linked' }))
            // The claim used up the invitation that allowed it (#277).
            expect(queryDatabase(`SELECT id FROM Invitation WHERE groupId = ${Number(groupId)};`)).toEqual([])

            const groupPersonId = Number(groupPersonRows[0].id)
            const accountId = Number(groupPersonRows[0].accountId)
            expect(accountId).toBeGreaterThan(0)
            expect(
                queryDatabase(
                    `SELECT gameId, status, source, enteredByAccountId FROM GroupPersonGameOwnership WHERE groupPersonId = ${groupPersonId};`,
                ),
            ).toEqual([{ gameId: expect.any(Number), status: 'asserted', source: 'claimed_import', enteredByAccountId: accountId }])
            expect(queryDatabase(`SELECT gameId FROM GroupPersonGamePreference WHERE groupPersonId = ${groupPersonId};`)).toEqual([])
            expect(queryDatabase(`SELECT gameId FROM OwnedGame WHERE accountId = ${accountId};`)).toEqual([
                { gameId: expect.any(Number) },
            ])
        } finally {
            await inviteeContext.close()
        }
    })
})
