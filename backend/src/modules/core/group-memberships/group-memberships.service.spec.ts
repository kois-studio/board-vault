import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { fakeActivityNotifier } from '../../../../test/fake-activity-notifier.js'
import { fakeDatabase } from '../../../../test/fake-database.js'
import { ProviderTimeoutError } from '../../../common/http/provider-timeout.js'

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
        const acceptInvitationAtomically = vi.fn().mockResolvedValue({ success: true, joined: true })
        const databaseService = fakeDatabase({
            getInvitationByGroupAndRecipient: vi.fn().mockResolvedValue({ rows: [[42]] }),
            acceptInvitationAtomically,
        })
        const notifier = fakeActivityNotifier()
        const service = new GroupMembershipsService(databaseService, notifier)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).resolves.toEqual({ success: true })
        expect(acceptInvitationAtomically).toHaveBeenCalledWith(42, 7, 12)
        expect(notifier.memberJoined).toHaveBeenCalledWith(12, 7)
    })

    it('tells nobody that someone joined who was already in the group', async () => {
        const databaseService = fakeDatabase({
            getInvitationByGroupAndRecipient: vi.fn().mockResolvedValue({ rows: [[42]] }),
            acceptInvitationAtomically: vi.fn().mockResolvedValue({ success: true, joined: false }),
        })
        const notifier = fakeActivityNotifier()
        const service = new GroupMembershipsService(databaseService, notifier)

        await expect(service.createGroupMembershipFromInvitation(7, 12)).resolves.toEqual({ success: true })
        expect(notifier.memberJoined).not.toHaveBeenCalled()
    })
})

describe('GroupMembershipsService leaving through DELETE /memberships', () => {
    const createService = ({ member = true, ownerId = 1 } = {}) => {
        const leaveGroup = vi.fn().mockResolvedValue({ left: true })
        const notifier = fakeActivityNotifier()
        const databaseService = fakeDatabase({
            getGroupMembershipById: vi.fn().mockResolvedValue({ rows: member ? [{ accountId: 7, groupId: 12 }] : [] }),
            getGroupById: vi.fn().mockResolvedValue({ rows: [{ id: 12, createdBy: ownerId }] }),
            leaveGroup,
        })

        return { service: new GroupMembershipsService(databaseService, notifier), leaveGroup, notifier }
    }

    it('leaves the way the app does, so upcoming sessions drop the person and history keeps them', async () => {
        const { service, leaveGroup, notifier } = createService()

        await expect(service.deleteGroupMembershipById(7, 12)).resolves.toEqual({ success: true })
        expect(leaveGroup).toHaveBeenCalledWith(7, 12, { groupId: 12, actorAccountId: 7, type: 'member_left' })
        expect(notifier.memberLeft).toHaveBeenCalledWith(12, 7, 7)
    })

    it('tells nobody when the membership was already gone by the time it left', async () => {
        const { service, leaveGroup, notifier } = createService()

        leaveGroup.mockResolvedValue({ left: false })
        await service.deleteGroupMembershipById(7, 12)
        expect(notifier.memberLeft).not.toHaveBeenCalled()
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

describe('GroupMembershipsService getSafeGroupMembershipById (#245)', () => {
    const serviceWith = (getGroupMembershipById: ReturnType<typeof vi.fn>) =>
        new GroupMembershipsService(fakeDatabase({ getGroupMembershipById }), fakeActivityNotifier())

    it('returns the membership of a member', async () => {
        const service = serviceWith(vi.fn().mockResolvedValue({ rows: [[7, 12, '2026-01-01 10:00:00']] }))

        await expect(service.getSafeGroupMembershipById(7, 12)).resolves.toEqual({
            accountId: 7,
            groupId: 12,
            joinedAt: '2026-01-01 10:00:00',
        })
    })

    it('returns null when the account is not in the group', async () => {
        await expect(serviceWith(vi.fn().mockResolvedValue({ rows: [] })).getSafeGroupMembershipById(7, 12)).resolves.toBeNull()
    })

    it('throws a database timeout instead of passing it off as "not a member"', async () => {
        const service = serviceWith(vi.fn().mockRejectedValue(new ProviderTimeoutError('database')))

        await expect(service.getSafeGroupMembershipById(7, 12)).rejects.toBeInstanceOf(ProviderTimeoutError)
    })

    it('throws any other database error too', async () => {
        const failure = new Error('SQLITE_BUSY')

        await expect(serviceWith(vi.fn().mockRejectedValue(failure)).getSafeGroupMembershipById(7, 12)).rejects.toBe(failure)
    })
})
