import { createClerkClient } from '@clerk/backend'
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common'

import { API_ERROR_CODES, BoardVaultHttpException } from '../../../common/http/api-error.js'

import { ClerkIdentityService } from './clerk-identity.service.js'

vi.mock('@clerk/backend', () => ({
    createClerkClient: vi.fn(),
}))

describe('ClerkIdentityService', () => {
    const mockedCreateClerkClient = vi.mocked(createClerkClient)
    const configService = { get: vi.fn().mockReturnValue('secret') }
    const usersService = {
        getUserByClerkId: vi.fn(),
        getUserByEmail: vi.fn(),
        getUserByUsername: vi.fn(),
        createClerkUser: vi.fn(),
    }
    const service = new ClerkIdentityService(configService as never, usersService as never)

    beforeEach(() => {
        vi.clearAllMocks()
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: vi.fn().mockResolvedValue({
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
    })

    it('keeps a short first name as it is (#125)', async () => {
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: vi.fn().mockResolvedValue({
                    username: 'ana-plays',
                    firstName: 'Ana',
                    lastName: null,
                    publicMetadata: {},
                    primaryEmailAddressId: 'email_1',
                    emailAddresses: [{ id: 'email_1', emailAddress: 'new@example.com', verification: { status: 'verified' } }],
                }),
            },
        } as never)

        await service.resolveAccount('user_new')

        expect(usersService.createClerkUser).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ana' }))
    })

    it('reads the username and primary email Clerk has now, for syncing', async () => {
        await expect(service.getClerkProfile('user_new')).resolves.toEqual({
            clerkUserId: 'user_new',
            username: 'new-player',
            primaryEmail: 'new@example.com',
            primaryEmailVerified: true,
        })
        // Nothing here resolves an account: drop the one-time lookup beforeEach queued for provisioning.
        usersService.getUserByClerkId.mockReset()
    })

    it('provisions a local account for a new Clerk identity', async () => {
        const result = await service.resolveAccount('user_new', 'es')

        expect(result).toEqual({ id: 9, email: 'new@example.com', isAdmin: false })
        expect(usersService.createClerkUser).toHaveBeenCalledWith({
            email: 'new@example.com',
            username: 'new-player',
            displayName: 'New Player',
            clerkUserId: 'user_new',
            locale: 'es',
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

    it('never links or duplicates an account that already owns the email', async () => {
        usersService.getUserByEmail.mockResolvedValue({ id: 1, email: 'new@example.com', isAdmin: true, isDeleted: false })

        const resolution = service.resolveAccount('user_new')

        await expect(resolution).rejects.toBeInstanceOf(BoardVaultHttpException)
        await expect(resolution).rejects.toMatchObject({
            status: 409,
            response: { code: API_ERROR_CODES.ACCOUNT_EMAIL_CONFLICT },
        })
        expect(usersService.createClerkUser).not.toHaveBeenCalled()
    })

    it('rejects a Clerk identity whose primary email is not verified', async () => {
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: vi.fn().mockResolvedValue({
                    publicMetadata: {},
                    primaryEmailAddressId: 'email_1',
                    emailAddresses: [{ id: 'email_1', emailAddress: 'new@example.com', verification: { status: 'unverified' } }],
                }),
            },
        } as never)

        await expect(service.resolveAccount('user_new')).rejects.toBeInstanceOf(UnauthorizedException)
        expect(usersService.createClerkUser).not.toHaveBeenCalled()
    })

    it('refuses a soft-deleted linked account', async () => {
        usersService.getUserByClerkId.mockReset().mockResolvedValue({ id: 1, email: 'gone@example.com', isAdmin: false, isDeleted: true })

        await expect(service.resolveAccount('user_existing')).rejects.toBeInstanceOf(UnauthorizedException)
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

    it('does not open an account from an old Clerk group invitation while registration is closed (#277)', async () => {
        const previousNodeEnvironment = process.env.NODE_ENV
        const previousRegistrationSetting = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        process.env.NODE_ENV = 'production'
        delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: vi.fn().mockResolvedValue({
                    username: 'invited-player',
                    primaryEmailAddressId: 'email_1',
                    emailAddresses: [{ id: 'email_1', emailAddress: 'invite@example.com', verification: { status: 'verified' } }],
                    publicMetadata: { boardVaultGroupInvitation: { groupId: 12, inviterAccountId: 7, version: 1 } },
                }),
            },
        } as never)

        try {
            await expect(service.resolveAccount('user_invited')).rejects.toBeInstanceOf(ForbiddenException)
            expect(usersService.createClerkUser).not.toHaveBeenCalled()
        } finally {
            if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV
            else process.env.NODE_ENV = previousNodeEnvironment
            if (previousRegistrationSetting === undefined) delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
            else process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = previousRegistrationSetting
        }
    })

    it('maps an unexpected Clerk provider failure to a stable safe code', async () => {
        mockedCreateClerkClient.mockReturnValue({
            users: { getUser: vi.fn().mockRejectedValue(new Error('provider payload must not escape')) },
        } as never)

        const error = await service.resolveAccount('user_new').catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(BoardVaultHttpException)
        expect((error as BoardVaultHttpException).getResponse()).toEqual({
            code: API_ERROR_CODES.CLERK_PROVIDER_UNAVAILABLE,
            message: 'The identity provider is temporarily unavailable',
        })
        expect((error as BoardVaultHttpException).getStatus()).toBe(502)
    })
})
