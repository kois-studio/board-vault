import { ForbiddenException } from '@nestjs/common'

import { GameProposalService } from '../../core/game-proposal/game-proposal.service'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GroupsService } from '../../core/groups/groups.service'
import { InvitationsService } from '../../core/invitations/invitations.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import { UsersService } from '../../core/users/users.service'

import { ProfileService } from './profile.service'

describe('ProfileService invitation acceptance', () => {
    it('returns only self-profile fields instead of account-state fields', async () => {
        const service = new ProfileService(
            {
                getUserById: jest.fn().mockResolvedValue({
                    id: 8,
                    email: 'member@example.com',
                    username: 'member',
                    displayName: 'Member',
                    avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'ME' },
                    createdAt: '2026-09-04 12:00:00',
                    isDeleted: false,
                    isAdmin: true,
                    email_verified: true,
                }),
            } as unknown as UsersService,
            {} as NotificationsService,
            {} as GroupsService,
            {} as InvitationsService,
            {} as GroupMembershipsService,
            {} as GameProposalService,
        )

        await expect(service.getUserById(8)).resolves.toEqual({
            id: 8,
            email: 'member@example.com',
            username: 'member',
            displayName: 'Member',
            avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'ME' },
            createdAt: '2026-09-04 12:00:00',
        })
    })

    it('denies accepting an invitation addressed to another user', async () => {
        const invitationsService = {
            getInvitationById: jest.fn().mockResolvedValue({ id: 1, groupId: 12, fromAccountId: 7, toAccountId: 8 }),
            isExpired: jest.fn().mockReturnValue(false),
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

    it('does not accept an expired invitation', async () => {
        const invitationsService = {
            getInvitationById: jest
                .fn()
                .mockResolvedValue({ id: 1, groupId: 12, fromAccountId: 7, toAccountId: 8, expiresAt: '2000-08-13 00:00:00' }),
            isExpired: jest.fn().mockReturnValue(true),
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

        await expect(service.acceptInvitation(8, 1)).rejects.toThrow('This invitation has expired')
        expect(groupMembershipsService.createGroupMembership).not.toHaveBeenCalled()
    })
})
