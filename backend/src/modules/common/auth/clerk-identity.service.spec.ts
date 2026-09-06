import { createClerkClient } from '@clerk/backend'
import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { ClerkIdentityService } from './clerk-identity.service'

jest.mock('@clerk/backend', () => ({
    createClerkClient: jest.fn(),
}))

describe('ClerkIdentityService', () => {
    const mockedCreateClerkClient = jest.mocked(createClerkClient)
    const configService = { get: jest.fn().mockReturnValue('secret') }
    const usersService = {
        getUserByClerkId: jest.fn(),
        getUserByEmail: jest.fn(),
        getUserByUsername: jest.fn(),
        createClerkUser: jest.fn(),
        linkClerkUser: jest.fn(),
    }
    const databaseService = {
        getGroupById: jest.fn(),
        joinGroupFromClerkInvitation: jest.fn(),
    }
    const service = new ClerkIdentityService(configService as never, usersService as never, databaseService as never)

    beforeEach(() => {
        jest.clearAllMocks()
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: jest.fn().mockResolvedValue({
                    username: 'new-player',
                    firstName: 'New',
                    lastName: 'Player',
                    publicMetadata: {},
                    primaryEmailAddressId: 'email_1',
                    emailAddresses: [{ id: 'email_1', emailAddress: 'new@example.com', verification: { status: 'verified' } }],
                }),
            },
        } as never)
        usersService.getUserByClerkId.mockRejectedValueOnce(new NotFoundException()).mockResolvedValue({
            id: 9,
            email: 'new@example.com',
            isAdmin: false,
        })
        usersService.getUserByEmail.mockRejectedValue(new NotFoundException())
        usersService.getUserByUsername.mockRejectedValue(new NotFoundException())
        usersService.createClerkUser.mockResolvedValue({ success: true })
        databaseService.joinGroupFromClerkInvitation.mockResolvedValue(undefined)
    })

    it('provisions a local account for a new Clerk identity', async () => {
        const result = await service.resolveAccount('user_new')

        expect(result).toEqual({ id: 9, email: 'new@example.com', isAdmin: false })
        expect(usersService.createClerkUser).toHaveBeenCalledWith({
            email: 'new@example.com',
            username: 'new-player',
            displayName: 'New Player',
            clerkUserId: 'user_new',
            avatar: {
                backgroundColor: '#6366F1',
                iconName: null,
                emoji: null,
                type: 'initials',
                initials: 'NP',
            },
        })
    })

    it('keeps an already linked account authoritative', async () => {
        const linkedAccount = { id: 1, email: 'existing@example.com', isAdmin: true, isDeleted: false } as never

        usersService.getUserByClerkId.mockReset().mockResolvedValue(linkedAccount)

        await expect(service.resolveAccount('user_existing')).resolves.toBe(linkedAccount)
        expect(mockedCreateClerkClient).not.toHaveBeenCalled()
        expect(usersService.createClerkUser).not.toHaveBeenCalled()
    })

    it('migrates an exact-email account from a development Clerk identity', async () => {
        const existingAccount = {
            id: 1,
            email: 'new@example.com',
            isAdmin: true,
            isDeleted: false,
            clerkUserId: 'user_development',
        }
        const migratedAccount = { ...existingAccount, clerkUserId: 'user_new' }

        usersService.getUserByEmail.mockResolvedValue(existingAccount)
        usersService.linkClerkUser.mockResolvedValue(migratedAccount)

        await expect(service.resolveAccount('user_new')).resolves.toBe(migratedAccount)
        expect(usersService.linkClerkUser).toHaveBeenCalledWith(1, 'user_new')
        expect(usersService.createClerkUser).not.toHaveBeenCalled()
    })

    it('does not provision unknown Clerk identities while production registration is closed', async () => {
        const previousNodeEnvironment = process.env.NODE_ENV
        const previousRegistrationSetting = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        process.env.NODE_ENV = 'production'
        delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        try {
            await expect(service.resolveAccount('user_new')).rejects.toBeInstanceOf(ForbiddenException)
            expect(usersService.createClerkUser).not.toHaveBeenCalled()
        } finally {
            if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV
            else process.env.NODE_ENV = previousNodeEnvironment
            if (previousRegistrationSetting === undefined) delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
            else process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = previousRegistrationSetting
        }
    })

    it('provisions and joins a user through a valid Clerk group invitation while registration is closed', async () => {
        const previousNodeEnvironment = process.env.NODE_ENV
        const previousRegistrationSetting = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        process.env.NODE_ENV = 'production'
        delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: jest.fn().mockResolvedValue({
                    username: 'invited-player',
                    firstName: 'Invited',
                    lastName: 'Player',
                    primaryEmailAddressId: 'email_1',
                    emailAddresses: [{ id: 'email_1', emailAddress: 'invite@example.com', verification: { status: 'verified' } }],
                    publicMetadata: {
                        boardVaultGroupInvitation: { groupId: 12, inviterAccountId: 7, version: 1 },
                    },
                }),
            },
        } as never)
        usersService.getUserByClerkId.mockReset().mockRejectedValueOnce(new NotFoundException())
        usersService.getUserByEmail.mockRejectedValue(new NotFoundException())
        usersService.createClerkUser.mockResolvedValue({ success: true })
        usersService.getUserByClerkId.mockResolvedValue({ id: 9, email: 'invite@example.com', isAdmin: false })

        try {
            await expect(service.resolveAccount('user_invited')).resolves.toEqual({ id: 9, email: 'invite@example.com', isAdmin: false })
            expect(databaseService.joinGroupFromClerkInvitation).toHaveBeenCalledWith(9, {
                groupId: 12,
                inviterAccountId: 7,
                version: 1,
            })
        } finally {
            if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV
            else process.env.NODE_ENV = previousNodeEnvironment
            if (previousRegistrationSetting === undefined) delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
            else process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = previousRegistrationSetting
        }
    })

    it('creates a Clerk group invitation with private metadata and a configured redirect', async () => {
        configService.get.mockImplementation((key: string) =>
            key === 'BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL' ? 'https://board-vault.test/register' : 'secret',
        )
        databaseService.getGroupById.mockResolvedValue({ rows: [[12, 'Friends', 7]] })
        const createInvitation = jest.fn().mockResolvedValue({
            id: 'invitation_123',
            emailAddress: 'invite@example.com',
            url: 'https://clerk.test/invite',
        })

        mockedCreateClerkClient.mockReturnValue({ invitations: { createInvitation } } as never)

        await expect(service.createGroupInvitation(12, 7, 'invite@example.com')).resolves.toEqual({
            invitationId: 'invitation_123',
            emailAddress: 'invite@example.com',
            url: 'https://clerk.test/invite',
        })
        expect(createInvitation).toHaveBeenCalledWith({
            emailAddress: 'invite@example.com',
            expiresInDays: 30,
            notify: true,
            redirectUrl: 'https://board-vault.test/register',
            publicMetadata: {
                boardVaultGroupInvitation: { groupId: 12, inviterAccountId: 7, version: 1 },
            },
        })
    })

    it('lists only pending Clerk invitations owned by the requested group', async () => {
        databaseService.getGroupById.mockResolvedValue({ rows: [[12, 'Friends', 7]] })
        const getInvitationList = jest.fn().mockResolvedValue({
            totalCount: 3,
            data: [
                {
                    id: 'invitation_group',
                    emailAddress: 'friend@example.com',
                    status: 'pending',
                    createdAt: 1757066400000,
                    publicMetadata: { boardVaultGroupInvitation: { groupId: 12, inviterAccountId: 7, version: 1 } },
                },
                {
                    id: 'invitation_other_group',
                    emailAddress: 'other@example.com',
                    status: 'pending',
                    createdAt: 1757066400000,
                    publicMetadata: { boardVaultGroupInvitation: { groupId: 99, inviterAccountId: 7, version: 1 } },
                },
                {
                    id: 'invitation_unrelated',
                    emailAddress: 'unrelated@example.com',
                    status: 'pending',
                    createdAt: 1757066400000,
                    publicMetadata: {},
                },
            ],
        })

        mockedCreateClerkClient.mockReturnValue({ invitations: { getInvitationList } } as never)

        await expect(service.getGroupInvitations(12, 7)).resolves.toEqual([
            {
                invitationId: 'invitation_group',
                emailAddress: 'friend@example.com',
                status: 'pending',
                createdAt: '2025-09-05T10:00:00.000Z',
            },
        ])
        expect(getInvitationList).toHaveBeenCalledWith({ limit: 500, offset: 0, orderBy: '-created_at', status: 'pending' })
    })

    it('revokes only a pending Clerk invitation carrying the requested group metadata', async () => {
        databaseService.getGroupById.mockResolvedValue({ rows: [[12, 'Friends', 7]] })
        const getInvitationList = jest.fn().mockResolvedValue({
            totalCount: 1,
            data: [
                {
                    id: 'invitation_group',
                    emailAddress: 'friend@example.com',
                    status: 'pending',
                    createdAt: 1757066400000,
                    publicMetadata: { boardVaultGroupInvitation: { groupId: 12, inviterAccountId: 7, version: 1 } },
                },
            ],
        })
        const revokeInvitation = jest.fn().mockResolvedValue({})

        mockedCreateClerkClient.mockReturnValue({ invitations: { getInvitationList, revokeInvitation } } as never)

        await expect(service.revokeGroupInvitation(12, 7, 'invitation_group')).resolves.toEqual({ success: true })
        expect(revokeInvitation).toHaveBeenCalledWith('invitation_group')
    })

    it('does not revoke an invitation belonging to another group', async () => {
        databaseService.getGroupById.mockResolvedValue({ rows: [[12, 'Friends', 7]] })
        const getInvitationList = jest.fn().mockResolvedValue({
            totalCount: 1,
            data: [
                {
                    id: 'invitation_other_group',
                    emailAddress: 'other@example.com',
                    status: 'pending',
                    createdAt: 1757066400000,
                    publicMetadata: { boardVaultGroupInvitation: { groupId: 99, inviterAccountId: 7, version: 1 } },
                },
            ],
        })
        const revokeInvitation = jest.fn()

        mockedCreateClerkClient.mockReturnValue({ invitations: { getInvitationList, revokeInvitation } } as never)

        await expect(service.revokeGroupInvitation(12, 7, 'invitation_other_group')).rejects.toBeInstanceOf(NotFoundException)
        expect(revokeInvitation).not.toHaveBeenCalled()
    })
})
