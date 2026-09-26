import { execFileSync } from 'node:child_process'

import { createClerkClient } from '@clerk/backend'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from './fixtures/clerk-testing'

const enabled = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_CLAIM'] === '1'
const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const inviteeEmail = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_INVITEE_EMAIL']
const inviteeUsername = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_INVITEE_USERNAME']
const inviteePassword = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_INVITEE_PASSWORD']
const gameTitle = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_GAME_TITLE']
const databasePath = process.env['PLAYWRIGHT_SINGLE_USER_GROUP_DB_PATH']
const apiPort = process.env['PLAYWRIGHT_API_PORT']

test.describe('single-user group claim flow', () => {
    test.skip(
        !enabled || !ownerStorageState || !inviteeEmail || !inviteeUsername || !inviteePassword || !gameTitle || !databasePath,
        'Set the explicit flag, owner state, disposable invitee credentials, a fixture game, and the local SQLite path.',
    )
    test.use({ storageState: ownerStorageState })

    test('creates group people, configures one, and verifies the registered invitee claim in SQLite', async ({ page, browser, baseURL }) => {
        const inviteeContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
        const inviteePage = await inviteeContext.newPage()
        let providerInvitationId: string | undefined

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
            await page.getByRole('link', { name: 'Create a group' }).first().click()
            const groupName = `Phantom claim ${Date.now().toString().slice(-8)}`
            await page.getByLabel('What should your group be called?').fill(groupName)
            await page.getByRole('button', { name: 'Create group', exact: true }).click()
            await expect(page).toHaveURL(/\/groups\/\d+$/)
            const groupId = page.url().match(/\/groups\/(\d+)$/)?.[1]
            expect(groupId).toBeTruthy()

            for (const displayName of ['Ana', 'Bruno', 'Carla']) {
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
            const claimPersonSelect = page.getByLabel('Optional: invite them to claim a group person')
            await claimPersonSelect.selectOption({ label: 'Claim Ana' })
            await page.getByLabel('Their email address').fill(inviteeEmail ?? '')
            await page.getByRole('button', { name: 'Send email invite', exact: true }).click()

            const invitationLink = await page.getByRole('link', { name: 'Open link' }).getAttribute('href')
            expect(invitationLink).toContain('/v1/tickets/accept?ticket=')
            const ticket = invitationLink ? new URL(invitationLink).searchParams.get('ticket') : null
            const ticketPayload = ticket?.split('.')[1]
            if (ticketPayload) {
                const payload = JSON.parse(Buffer.from(ticketPayload, 'base64url').toString('utf8')) as { sid?: unknown }
                providerInvitationId = typeof payload.sid === 'string' ? payload.sid : undefined
            }

            await inviteePage.goto(invitationLink ?? '')
            await expect(inviteePage.getByRole('heading', { name: 'Join your Board Vault group' })).toBeVisible()
            await setupClerkTestingToken({ context: inviteeContext })
            await inviteePage.getByLabel('Choose a username').fill(inviteeUsername ?? '')
            await inviteePage.getByLabel('Create a password').fill(inviteePassword ?? '')
            await inviteePage.getByLabel('Confirm your password').fill(inviteePassword ?? '')
            await inviteePage.getByRole('button', { name: 'Join the group', exact: true }).click()

            await expect(inviteePage).toHaveURL(/\/dashboard$/)
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
                `SELECT id, accountId, kind, claimEmail, claimExpiresAt FROM GroupPerson WHERE groupId = ${Number(groupId)} AND displayName = 'Ana';`,
            )
            expect(groupPersonRows).toHaveLength(1)
            expect(groupPersonRows[0]).toEqual(
                expect.objectContaining({ kind: 'linked', claimEmail: null, claimExpiresAt: null }),
            )

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

            if (inviteeEmail && process.env['CLERK_SECRET_KEY']) {
                const clerkClient = createClerkClient({ secretKey: process.env['CLERK_SECRET_KEY'] })
                if (providerInvitationId) await clerkClient.invitations.revokeInvitation(providerInvitationId).catch(() => undefined)
                const users = await clerkClient.users.getUserList({ emailAddress: [inviteeEmail] })
                for (const user of users.data) await clerkClient.users.deleteUser(user.id)
            }
        }
    })
})
