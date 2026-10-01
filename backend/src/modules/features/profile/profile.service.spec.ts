import { ForbiddenException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'
import { DatabaseService } from '../../common/database/database.service'
import { GameProposalService } from '../../core/game-proposal/game-proposal.service'
import { GroupsService } from '../../core/groups/groups.service'
import { InvitationsService } from '../../core/invitations/invitations.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import { UsersService } from '../../core/users/users.service'

import { ProfileService } from './profile.service'

describe('ProfileService invitation acceptance', () => {
    it('returns only self-profile fields instead of account-state fields', async () => {
        const service = new ProfileService(
            {
                getUserById: vi.fn().mockResolvedValue({
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
            {} as DatabaseService,
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
            getInvitationById: vi.fn().mockResolvedValue({ id: 1, groupId: 12, fromAccountId: 7, toAccountId: 8 }),
            isExpired: vi.fn().mockReturnValue(false),
        }
        const databaseService = { acceptInvitationAtomically: vi.fn() }
        const service = new ProfileService(
            {} as UsersService,
            {} as NotificationsService,
            {} as GroupsService,
            invitationsService as unknown as InvitationsService,
            fakeDatabase(databaseService),
            {} as GameProposalService,
        )

        await expect(service.acceptInvitation(7, 1)).rejects.toThrow(ForbiddenException)
        expect(databaseService.acceptInvitationAtomically).not.toHaveBeenCalled()
    })

    it('does not accept an expired invitation', async () => {
        const invitationsService = {
            getInvitationById: vi
                .fn()
                .mockResolvedValue({ id: 1, groupId: 12, fromAccountId: 7, toAccountId: 8, expiresAt: '2000-08-13 00:00:00' }),
            isExpired: vi.fn().mockReturnValue(true),
        }
        const databaseService = { acceptInvitationAtomically: vi.fn() }
        const service = new ProfileService(
            {} as UsersService,
            {} as NotificationsService,
            {} as GroupsService,
            invitationsService as unknown as InvitationsService,
            fakeDatabase(databaseService),
            {} as GameProposalService,
        )

        await expect(service.acceptInvitation(8, 1)).rejects.toThrow('This invitation has expired')
        expect(databaseService.acceptInvitationAtomically).not.toHaveBeenCalled()
    })
})
