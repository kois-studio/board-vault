import { fakeDatabase } from '../../../../test/fake-database.js'

import { ClerkWebhookService } from './clerk-webhook.service.js'

import type { WebhookEvent } from '@clerk/backend/webhooks'
import type { Mock } from 'vitest'

const account = { id: 7, email: 'old@example.com', isDeleted: 0 }

function userUpdated(email: string, status = 'verified'): WebhookEvent {
    return {
        type: 'user.updated',
        object: 'event',
        data: {
            id: 'user_7',
            primary_email_address_id: 'idn_new',
            email_addresses: [
                { id: 'idn_old', email_address: 'old@example.com', verification: { status: 'verified' } },
                { id: 'idn_new', email_address: email, verification: { status } },
            ],
        },
    } as unknown as WebhookEvent
}

const userDeleted = { type: 'user.deleted', object: 'event', data: { id: 'user_7', deleted: true } } as unknown as WebhookEvent

function createService(overrides: Record<string, Mock> = {}) {
    const queries = {
        getUserByClerkId: vi.fn().mockResolvedValue({ rows: [account] }),
        getUserByEmail: vi.fn().mockResolvedValue({ rows: [] }),
        updateUserEmail: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        softDeleteUserById: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        ...overrides,
    }

    return { service: new ClerkWebhookService(fakeDatabase(queries)), queries }
}

describe('ClerkWebhookService', () => {
    it('syncs a changed, verified primary email to the linked account', async () => {
        const { service, queries } = createService()

        await service.handle(userUpdated('new@example.com'))

        expect(queries.getUserByClerkId).toHaveBeenCalledWith('user_7')
        expect(queries.updateUserEmail).toHaveBeenCalledWith(7, 'new@example.com')
    })

    it('ignores an unverified primary email', async () => {
        const { service, queries } = createService()

        await service.handle(userUpdated('new@example.com', 'unverified'))

        expect(queries.updateUserEmail).not.toHaveBeenCalled()
    })

    it('does not take an email that belongs to another account', async () => {
        const { service, queries } = createService({
            getUserByEmail: vi.fn().mockResolvedValue({ rows: [{ id: 9, email: 'new@example.com' }] }),
        })

        await service.handle(userUpdated('new@example.com'))

        expect(queries.updateUserEmail).not.toHaveBeenCalled()
    })

    it('does nothing when the primary email is unchanged', async () => {
        const { service, queries } = createService()

        await service.handle(userUpdated('old@example.com'))

        expect(queries.getUserByEmail).not.toHaveBeenCalled()
        expect(queries.updateUserEmail).not.toHaveBeenCalled()
    })

    it('ignores users with no linked account', async () => {
        const { service, queries } = createService({ getUserByClerkId: vi.fn().mockResolvedValue({ rows: [] }) })

        await service.handle(userUpdated('new@example.com'))
        await service.handle(userDeleted)

        expect(queries.updateUserEmail).not.toHaveBeenCalled()
        expect(queries.softDeleteUserById).not.toHaveBeenCalled()
    })

    it('soft-deletes the linked account when its Clerk user is deleted', async () => {
        const { service, queries } = createService()

        await service.handle(userDeleted)

        expect(queries.softDeleteUserById).toHaveBeenCalledWith(7)
    })

    it('treats a repeated deletion as done', async () => {
        const { service, queries } = createService({
            getUserByClerkId: vi.fn().mockResolvedValue({ rows: [{ ...account, isDeleted: 1 }] }),
        })

        await service.handle(userDeleted)

        expect(queries.softDeleteUserById).not.toHaveBeenCalled()
    })

    it('ignores other event types', async () => {
        const { service, queries } = createService()

        await service.handle({ type: 'session.created', object: 'event', data: {} } as unknown as WebhookEvent)

        expect(queries.getUserByClerkId).not.toHaveBeenCalled()
    })
})
