import { CreateGroupRequestBody } from '../../../common/types/group.type'
import { ClerkIdentityService } from '../../common/auth/clerk-identity.service'

import { GroupAcquisitionService } from './group-acquisition.service'
import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'

describe('GroupsController actor and listing boundaries', () => {
    const request = { user: { userId: 7 } }

    it('scopes the legacy group list to the authenticated account', async () => {
        const getGroupsForAccount = jest.fn().mockResolvedValue([])
        const controller = new GroupsController(
            { getGroupsForAccount } as unknown as GroupsService,
            {} as GroupAcquisitionService,
            {} as ClerkIdentityService,
        )

        await controller.getGroups(request)

        expect(getGroupsForAccount).toHaveBeenCalledWith(7)
    })

    it('derives the legacy group creator from the authenticated account', async () => {
        const createGroup = jest.fn().mockResolvedValue({ success: true })
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
        const createGroupInvitation = jest.fn().mockResolvedValue({
            invitationId: 'invitation_123',
            emailAddress: 'friend@example.com',
            url: 'https://clerk.test/invite',
        })
        const controller = new GroupsController({} as GroupsService, {} as GroupAcquisitionService, { createGroupInvitation } as never)

        await controller.createClerkInvitation(12, request, { emailAddress: 'friend@example.com' })

        expect(createGroupInvitation).toHaveBeenCalledWith(12, 7, 'friend@example.com')
    })
})
