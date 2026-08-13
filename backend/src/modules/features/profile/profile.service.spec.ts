import { ForbiddenException } from '@nestjs/common'

import { GameProposalService } from '../../core/game-proposal/game-proposal.service'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GroupsService } from '../../core/groups/groups.service'
import { InvitationsService } from '../../core/invitations/invitations.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import { UsersService } from '../../core/users/users.service'

import { ProfileService } from './profile.service'

describe('ProfileService invitation acceptance', () => {
    it('denies accepting an invitation addressed to another user', async () => {
        const invitationsService = {
            getInvitationById: jest.fn().mockResolvedValue({ id: 1, groupId: 12, fromAccountId: 7, toAccountId: 8 }),
        }
        const groupMembershipsService = { createGroupMembership: jest.fn() }
        const service = new ProfileService(
            {} as UsersService,
            {} as NotificationsService,
            {} as GroupsService,
            invitationsService as unknown as InvitationsService,
            groupMembershipsService as unknown as GroupMembershipsService,
            {} as GameProposalService,
        )

        await expect(service.acceptInvitation(7, 1)).rejects.toThrow(ForbiddenException)
        expect(groupMembershipsService.createGroupMembership).not.toHaveBeenCalled()
    })
})
