import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { InvitationsService } from './invitations.service'

const invitationRows = [[1, 12, 7, 8, '2026-08-13 00:00:00', '2099-08-13 00:00:00']]

describe('InvitationsService lifecycle authorization', () => {
    const createService = () => {
        const getInvitationById = jest.fn().mockResolvedValue({ rows: invitationRows })
        const getUserInvitationsReceived = jest.fn().mockResolvedValue({ rows: invitationRows })
        const deleteInvitationById = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new InvitationsService(
            fakeDatabase({
                getInvitationById,
                getUserInvitationsReceived,
                deleteInvitationById,
            }),
        )

        return { service, getInvitationById, getUserInvitationsReceived, deleteInvitationById }
    }

    it('scopes the legacy invitation list to the authenticated recipient', async () => {
        const { service, getUserInvitationsReceived } = createService()

        await expect(service.getInvitations(8)).resolves.toHaveLength(1)
        expect(getUserInvitationsReceived).toHaveBeenCalledWith(8)
    })

    it('allows a sender or recipient to read one invitation', async () => {
        const { service } = createService()

        await expect(service.getInvitationByIdForAccount(1, 7)).resolves.toMatchObject({ id: 1 })
        await expect(service.getInvitationByIdForAccount(1, 8)).resolves.toMatchObject({ id: 1 })
    })

    it('hides an invitation from unrelated accounts', async () => {
        const { service } = createService()

        await expect(service.getInvitationByIdForAccount(1, 99)).rejects.toThrow(NotFoundException)
    })

    it('allows the sender to cancel an invitation', async () => {
        const { service, deleteInvitationById } = createService()

        await expect(service.deleteInvitationById(1, 7)).resolves.toEqual({ success: true })
        expect(deleteInvitationById).toHaveBeenCalledWith(1)
    })

    it('denies a non-sender from cancelling an invitation', async () => {
        const { service, deleteInvitationById } = createService()

        await expect(service.deleteInvitationById(1, 8)).rejects.toThrow(ForbiddenException)
        expect(deleteInvitationById).not.toHaveBeenCalled()
    })

    it('allows the recipient to reject an invitation', async () => {
        const { service, deleteInvitationById } = createService()

        await expect(service.rejectInvitation(1, 8)).resolves.toEqual({ success: true })
        expect(deleteInvitationById).toHaveBeenCalledWith(1)
    })

    it('denies a non-recipient from rejecting an invitation', async () => {
        const { service, deleteInvitationById } = createService()

        await expect(service.rejectInvitation(1, 7)).rejects.toThrow(ForbiddenException)
        expect(deleteInvitationById).not.toHaveBeenCalled()
    })

    it('recognizes invitations past their expiry timestamp', () => {
        const { service } = createService()

        expect(
            service.isExpired({
                id: 1,
                groupId: 12,
                fromAccountId: 7,
                toAccountId: 8,
                sentAt: '2026-08-13 00:00:00',
                expiresAt: '2000-08-13 00:00:00',
            }),
        ).toBe(true)
        expect(
            service.isExpired({
                id: 1,
                groupId: 12,
                fromAccountId: 7,
                toAccountId: 8,
                sentAt: '2026-08-13 00:00:00',
                expiresAt: '2099-08-13 00:00:00',
            }),
        ).toBe(false)
    })
})
