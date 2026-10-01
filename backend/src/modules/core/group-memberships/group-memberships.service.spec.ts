import { ForbiddenException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { GroupMembershipsService } from './group-memberships.service'

describe('GroupMembershipsService join policy', () => {
    it('requires a pending invitation before joining a group', async () => {
        const acceptInvitationAtomically = vi.fn()
        const databaseService = fakeDatabase({
            getInvitationByGroupAndRecipient: vi.fn().mockResolvedValue({ rows: [] }),
            acceptInvitationAtomically,
        })
        const service = new GroupMembershipsService(databaseService)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).rejects.toThrow(ForbiddenException)
        expect(acceptInvitationAtomically).not.toHaveBeenCalled()
    })

    it('creates membership and consumes the pending invitation', async () => {
        const acceptInvitationAtomically = vi.fn().mockResolvedValue({ success: true })
        const databaseService = fakeDatabase({
            getInvitationByGroupAndRecipient: vi.fn().mockResolvedValue({ rows: [[42]] }),
            acceptInvitationAtomically,
        })
        const service = new GroupMembershipsService(databaseService)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).resolves.toEqual({ success: true })
        expect(acceptInvitationAtomically).toHaveBeenCalledWith(42, 7, 12)
    })
})
