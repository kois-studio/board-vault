import { ForbiddenException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import { InvitationsService } from './invitations.service'

const invitationRows = [[1, 12, 7, 8, '2026-08-13 00:00:00']]

describe('InvitationsService lifecycle authorization', () => {
    const createService = () => {
        const getInvitationById = jest.fn().mockResolvedValue({ rows: invitationRows })
        const deleteInvitationById = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new InvitationsService({ getInvitationById, deleteInvitationById } as unknown as DatabaseService)

        return { service, getInvitationById, deleteInvitationById }
    }

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
})
