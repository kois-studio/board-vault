import { UpdateGroupAcquisitionDecisionBody } from '../../../common/types/group-game-interest.type'
import { CreateGroupRequestBody } from '../../../common/types/group.type'
import { ClerkIdentityService } from '../../common/auth/clerk-identity.service'

import { GroupAcquisitionService } from './group-acquisition.service'
import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'

describe('GroupsController actor and listing boundaries', () => {
    const request = { user: { userId: 7 } }

    it('scopes the legacy group list to the authenticated account', async () => {
        const getGroupsForAccount = vi.fn().mockResolvedValue([])
        const controller = new GroupsController(
            { getGroupsForAccount } as unknown as GroupsService,
            {} as GroupAcquisitionService,
            {} as ClerkIdentityService,
        )

        await controller.getGroups(request)

        expect(getGroupsForAccount).toHaveBeenCalledWith(7)
    })

    it('derives the legacy group creator from the authenticated account', async () => {
        const createGroup = vi.fn().mockResolvedValue({ success: true })
        const controller = new GroupsController(
            { createGroup } as unknown as GroupsService,
            {} as GroupAcquisitionService,
            {} as ClerkIdentityService,
        )
        const body = { name: 'Test group', createdBy: 999 } as unknown as CreateGroupRequestBody

        await controller.createGroup(request, body)

        expect(createGroup).toHaveBeenCalledWith({ name: 'Test group', createdBy: 7 })
    })

    it('derives the Clerk invitation sender from the authenticated account', async () => {
        const createGroupInvitation = vi.fn().mockResolvedValue({
            invitationId: 'inv_123',
            emailAddress: 'friend@example.com',
            url: 'https://clerk.test/invite',
        })
        const controller = new GroupsController({} as GroupsService, {} as GroupAcquisitionService, { createGroupInvitation } as never)

        await controller.createClerkInvitation(12, request, { emailAddress: 'friend@example.com' })

        expect(createGroupInvitation).toHaveBeenCalledWith(12, 7, 'friend@example.com')
    })

    it('derives the Clerk invitation listing owner from the authenticated account', async () => {
        const getGroupInvitations = vi.fn().mockResolvedValue([])
        const controller = new GroupsController({} as GroupsService, {} as GroupAcquisitionService, { getGroupInvitations } as never)

        await controller.getClerkInvitations(12, request)

        expect(getGroupInvitations).toHaveBeenCalledWith(12, 7)
    })

    it('derives the Clerk invitation revocation owner from the authenticated account', async () => {
        const revokeGroupInvitation = vi.fn().mockResolvedValue({ success: true })
        const controller = new GroupsController({} as GroupsService, {} as GroupAcquisitionService, { revokeGroupInvitation } as never)

        await controller.revokeClerkInvitation(12, { groupId: 12, invitationId: 'inv_123' }, request)

        expect(revokeGroupInvitation).toHaveBeenCalledWith(12, 7, 'inv_123')
    })

    it('derives the acquisition decision owner from the authenticated account', async () => {
        const updateDecision = vi.fn().mockResolvedValue({ success: true })
        const controller = new GroupsController(
            {} as GroupsService,
            { updateDecision } as unknown as GroupAcquisitionService,
            {} as ClerkIdentityService,
        )
        const body = { status: 'planned' } as UpdateGroupAcquisitionDecisionBody

        await controller.updateAcquisitionDecision(12, 42, request, body)

        expect(updateDecision).toHaveBeenCalledWith(12, 7, 42, body)
    })
})
