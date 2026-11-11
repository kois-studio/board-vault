import { ForbiddenException } from '@nestjs/common'

import { fakeActivityNotifier } from '../../../../test/fake-activity-notifier.js'
import { fakeDatabase } from '../../../../test/fake-database.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GameProposalService } from '../../core/game-proposal/game-proposal.service.js'
import { GroupsService } from '../../core/groups/groups.service.js'
import { InvitationsService } from '../../core/invitations/invitations.service.js'
import { NotificationsService } from '../../core/notifications/notifications.service.js'
import { UsersService } from '../../core/users/users.service.js'

import { ProfileService } from './profile.service.js'

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
            fakeActivityNotifier(),
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

    it('reads every invitation group and sender in one call each, and hides an invitation whose group or sender is gone (#251)', async () => {
        const invitation = (id: number, groupId: number, fromAccountId: number) => ({ id, groupId, fromAccountId, toAccountId: 8 })
        const groupsService = {
            getGroupsByIds: vi.fn().mockResolvedValue(new Map([[12, { id: 12, name: 'Fridays' }]])),
        }
        const usersService = {
            getPublicUsersByIds: vi.fn().mockResolvedValue(new Map([[7, { id: 7, username: 'friend' }]])),
        }
        const service = new ProfileService(
            usersService as unknown as UsersService,
            {} as NotificationsService,
            groupsService as unknown as GroupsService,
            {
                getUserInvitationsReceived: vi
                    .fn()
                    .mockResolvedValue([invitation(1, 12, 7), invitation(2, 99, 7), invitation(3, 12, 98), invitation(4, 12, 7)]),
            } as unknown as InvitationsService,
            {} as DatabaseService,
            {} as GameProposalService,
            fakeActivityNotifier(),
        )

        const invitations = await service.getUserInvitations(8)

        expect(invitations.map(({ id, group, fromAccount }) => [id, group.name, fromAccount.username])).toEqual([
            [1, 'Fridays', 'friend'],
            [4, 'Fridays', 'friend'],
        ])
        expect(groupsService.getGroupsByIds).toHaveBeenCalledTimes(1)
        expect(groupsService.getGroupsByIds).toHaveBeenCalledWith([12, 99, 12, 12])
        expect(usersService.getPublicUsersByIds).toHaveBeenCalledTimes(1)
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
            fakeActivityNotifier(),
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
            fakeActivityNotifier(),
        )

        await expect(service.acceptInvitation(8, 1)).rejects.toThrow('This invitation has expired')
        expect(databaseService.acceptInvitationAtomically).not.toHaveBeenCalled()
    })

    it('tells the group someone joined only when the invitation adds them', async () => {
        const accept = async (joined: boolean) => {
            const invitationsService = {
                getInvitationById: vi.fn().mockResolvedValue({ id: 1, groupId: 12, fromAccountId: 7, toAccountId: 8 }),
                isExpired: vi.fn().mockReturnValue(false),
            }
            const notifier = fakeActivityNotifier()
            const service = new ProfileService(
                {} as UsersService,
                {} as NotificationsService,
                {} as GroupsService,
                invitationsService as unknown as InvitationsService,
                fakeDatabase({ acceptInvitationAtomically: vi.fn().mockResolvedValue({ success: true, joined, choosePerson: !joined }) }),
                {} as GameProposalService,
                notifier,
            )

            await expect(service.acceptInvitation(8, 1)).resolves.toEqual({ success: true, groupId: 12, choosePerson: !joined })
            return notifier.memberJoined
        }

        expect(await accept(true)).toHaveBeenCalledWith(12, 8)
        expect(await accept(false)).not.toHaveBeenCalled()
    })
})
