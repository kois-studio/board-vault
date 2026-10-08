import { createClerkClient } from '@clerk/backend'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test } from './fixtures/clerk-testing'

const enabled = process.env['PLAYWRIGHT_NEW_PERSON_INVITATION'] === '1'
const ownerStorageState = process.env['PLAYWRIGHT_OWNER_STORAGE_STATE']
const inviteeEmail = process.env['PLAYWRIGHT_NEW_INVITEE_EMAIL']
const inviteeUsername = process.env['PLAYWRIGHT_NEW_INVITEE_USERNAME']
const inviteePassword = process.env['PLAYWRIGHT_NEW_INVITEE_PASSWORD']
const apiPort = process.env['PLAYWRIGHT_API_PORT']

test.describe('new-person invitation flow', () => {
    test.skip(
        !enabled || !ownerStorageState || !inviteeEmail || !inviteeUsername || !inviteePassword,
        'Set the explicit disposable-invitation flag, owner state, and Development invitee credentials.',
    )
    test.use({ storageState: ownerStorageState })

    test('creates a private group, completes the invited signup, and lands in the group', async ({ page, browser, baseURL }) => {
        const inviteeContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
        const inviteePage = await inviteeContext.newPage()
        let groupId: string | undefined
        let providerInvitationId: string | undefined

        const routeBoardVaultApi = async (targetPage: typeof page) => {
            if (!apiPort || apiPort === '3000') {
                return
            }

            await targetPage.route('http://localhost:3000/**', async (route) => {
                const url = new URL(route.request().url())
                url.port = apiPort
                await route.continue({ url: url.toString() })
            })
        }

        try {
            await routeBoardVaultApi(page)
            await routeBoardVaultApi(inviteePage)

            await page.goto(`${baseURL}/dashboard`)
            await page.getByRole('link', { name: 'Create a group' }).first().click()
            const groupName = `New invite ${Date.now().toString().slice(-8)}`
            await page.getByLabel('What should your group be called?').fill(groupName)
            await page.getByRole('button', { name: 'Create group', exact: true }).click()
            await expect(page).toHaveURL(/\/groups\/\d+\/edit$/)
            groupId = page.url().match(/\/groups\/(\d+)\/edit$/)?.[1]
            expect(groupId).toBeTruthy()

            await page.goto(`${baseURL}/groups/${groupId}/edit`)
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
            // The provider ticket URL is an HTML navigation, not a JSON FAPI
            // request. Install the Testing Token after that redirect so only
            // the subsequent sign-up exchange is intercepted.
            await setupClerkTestingToken({ context: inviteeContext })
            // Clerk JS already initialized without the token; reload so the
            // sign-up exchange carries it and bot protection is bypassed.
            await inviteePage.reload()
            await expect(inviteePage.getByRole('heading', { name: 'Join your Board Vault group' })).toBeVisible()
            await inviteePage.getByLabel('Choose a username').fill(inviteeUsername ?? '')
            await inviteePage.getByLabel('Create a password').fill(inviteePassword ?? '')
            await inviteePage.getByLabel('Confirm your password').fill(inviteePassword ?? '')
            await inviteePage.getByRole('button', { name: 'Join the group', exact: true }).click()

            await expect(inviteePage).toHaveURL(/\/dashboard$/)
            await expect(inviteePage.getByRole('heading', { name: 'Your groups' })).toBeVisible()
            await expect(inviteePage.getByText(groupName, { exact: true })).toBeVisible()
        } finally {
            await inviteeContext.close()

            if (inviteeEmail && process.env['CLERK_SECRET_KEY']) {
                const clerkClient = createClerkClient({ secretKey: process.env['CLERK_SECRET_KEY'] })
                if (providerInvitationId) {
                    await clerkClient.invitations.revokeInvitation(providerInvitationId).catch(() => undefined)
                }
                const users = await clerkClient.users.getUserList({ emailAddress: [inviteeEmail] })
                for (const user of users.data) {
                    await clerkClient.users.deleteUser(user.id)
                }
            }
        }
    })
})
