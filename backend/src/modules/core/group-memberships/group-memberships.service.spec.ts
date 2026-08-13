import { ForbiddenException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import { GroupMembershipsService } from './group-memberships.service'

describe('GroupMembershipsService join policy', () => {
    it('requires a pending invitation before joining a group', async () => {
        const createGroupMembership = jest.fn()
        const databaseService = {
            getInvitationByGroupAndRecipient: jest.fn().mockResolvedValue({ rows: [] }),
            createGroupMembership,
        } as unknown as DatabaseService
        const service = new GroupMembershipsService(databaseService)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).rejects.toThrow(ForbiddenException)
        expect(createGroupMembership).not.toHaveBeenCalled()
    })

    it('creates membership and consumes the pending invitation', async () => {
        const createGroupMembership = jest.fn().mockResolvedValue(undefined)
        const deleteInvitationById = jest.fn().mockResolvedValue(undefined)
        const databaseService = {
            getInvitationByGroupAndRecipient: jest.fn().mockResolvedValue({ rows: [[42]] }),
            createGroupMembership,
            deleteInvitationById,
        } as unknown as DatabaseService
        const service = new GroupMembershipsService(databaseService)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).resolves.toEqual({ success: true })
        expect(createGroupMembership).toHaveBeenCalledWith({ accountId: 7, groupId: 12 })
        expect(deleteInvitationById).toHaveBeenCalledWith(42)
    })
})
