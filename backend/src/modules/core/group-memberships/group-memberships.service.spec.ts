import { ForbiddenException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import { GroupMembershipsService } from './group-memberships.service'

describe('GroupMembershipsService join policy', () => {
    it('requires a pending invitation before joining a group', async () => {
        const acceptInvitationAtomically = jest.fn()
        const databaseService = {
            getInvitationByGroupAndRecipient: jest.fn().mockResolvedValue({ rows: [] }),
            acceptInvitationAtomically,
        } as unknown as DatabaseService
        const service = new GroupMembershipsService(databaseService)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).rejects.toThrow(ForbiddenException)
        expect(acceptInvitationAtomically).not.toHaveBeenCalled()
    })

    it('creates membership and consumes the pending invitation', async () => {
        const acceptInvitationAtomically = jest.fn().mockResolvedValue({ success: true })
        const databaseService = {
            getInvitationByGroupAndRecipient: jest.fn().mockResolvedValue({ rows: [[42]] }),
            acceptInvitationAtomically,
        } as unknown as DatabaseService
        const service = new GroupMembershipsService(databaseService)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).resolves.toEqual({ success: true })
        expect(acceptInvitationAtomically).toHaveBeenCalledWith(42, 7, 12)
    })
})
