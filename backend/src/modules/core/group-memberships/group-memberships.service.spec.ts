import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { fakeActivityNotifier } from '../../../../test/fake-activity-notifier.js'
import { fakeDatabase } from '../../../../test/fake-database.js'

import { GroupMembershipsService } from './group-memberships.service.js'

describe('GroupMembershipsService join policy', () => {
    it('requires a pending invitation before joining a group', async () => {
        const acceptInvitationAtomically = vi.fn()
        const databaseService = fakeDatabase({
            getInvitationByGroupAndRecipient: vi.fn().mockResolvedValue({ rows: [] }),
            acceptInvitationAtomically,
        })
        const service = new GroupMembershipsService(databaseService, fakeActivityNotifier())

        await expect(service.createGroupMembershipFromInvitation(7, 12)).rejects.toThrow(ForbiddenException)
        expect(acceptInvitationAtomically).not.toHaveBeenCalled()
    })

    it('creates membership and consumes the pending invitation', async () => {
        const acceptInvitationAtomically = vi.fn().mockResolvedValue({ success: true })
        const databaseService = fakeDatabase({
            getInvitationByGroupAndRecipient: vi.fn().mockResolvedValue({ rows: [[42]] }),
            acceptInvitationAtomically,
        })
        const service = new GroupMembershipsService(databaseService, fakeActivityNotifier())

        await expect(service.createGroupMembershipFromInvitation(7, 12)).resolves.toEqual({ success: true })
        expect(acceptInvitationAtomically).toHaveBeenCalledWith(42, 7, 12)
    })
})

describe('GroupMembershipsService leaving through DELETE /memberships', () => {
    const createService = ({ member = true, ownerId = 1 } = {}) => {
        const leaveGroup = vi.fn().mockResolvedValue(undefined)
        const databaseService = fakeDatabase({
            getGroupMembershipById: vi.fn().mockResolvedValue({ rows: member ? [{ accountId: 7, groupId: 12 }] : [] }),
            getGroupById: vi.fn().mockResolvedValue({ rows: [{ id: 12, createdBy: ownerId }] }),
            leaveGroup,
        })

        return { service: new GroupMembershipsService(databaseService, fakeActivityNotifier()), leaveGroup }
    }

    it('leaves the way the app does, so upcoming sessions drop the person and history keeps them', async () => {
        const { service, leaveGroup } = createService()

        await expect(service.deleteGroupMembershipById(7, 12)).resolves.toEqual({ success: true })
        expect(leaveGroup).toHaveBeenCalledWith(7, 12)
    })

    it('does not let the owner leave their own group', async () => {
        const { service, leaveGroup } = createService({ ownerId: 7 })

        await expect(service.deleteGroupMembershipById(7, 12)).rejects.toThrow(BadRequestException)
        expect(leaveGroup).not.toHaveBeenCalled()
    })

    it('answers not found when there is no membership to leave', async () => {
        const { service, leaveGroup } = createService({ member: false })

        await expect(service.deleteGroupMembershipById(7, 12)).rejects.toThrow(NotFoundException)
        expect(leaveGroup).not.toHaveBeenCalled()
    })
})
