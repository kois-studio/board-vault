import { createClerkClient } from '@clerk/backend'
import { NotFoundException } from '@nestjs/common'

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
    const service = new ClerkIdentityService(configService as never, usersService as never)

    beforeEach(() => {
        jest.clearAllMocks()
        mockedCreateClerkClient.mockReturnValue({
            users: {
                getUser: jest.fn().mockResolvedValue({
                    username: 'new-player',
                    firstName: 'New',
                    lastName: 'Player',
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
})
