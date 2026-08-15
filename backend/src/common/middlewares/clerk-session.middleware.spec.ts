import { verifyToken } from '@clerk/backend'

import { ClerkSessionMiddleware } from './clerk-session.middleware'

jest.mock('@clerk/backend', () => ({
    verifyToken: jest.fn(),
}))

describe('ClerkSessionMiddleware', () => {
    const mockedVerifyToken = jest.mocked(verifyToken)
    const configService = {
        get: jest.fn(
            (key: string) =>
                ({
                    CLERK_SECRET_KEY: 'secret',
                    CLERK_AUTHORIZED_PARTIES: 'https://board-vault.com,http://localhost:4200',
                })[key],
        ),
    }
    const clerkIdentityService = {
        resolveAccount: jest.fn(),
    }
    const middleware = new ClerkSessionMiddleware(configService as never, clerkIdentityService as never)

    beforeEach(() => {
        mockedVerifyToken.mockReset()
        clerkIdentityService.resolveAccount.mockReset()
    })

    it('resolves a verified Clerk token into the local request identity', async () => {
        mockedVerifyToken.mockResolvedValue({ sub: 'user_clerk_123' } as never)
        clerkIdentityService.resolveAccount.mockResolvedValue({ id: 7, email: 'person@example.com', isAdmin: true })
        const request = { path: '/profile/users/7', headers: { authorization: 'Bearer clerk-token' } } as {
            path: string
            headers: { authorization?: string }
            user?: unknown
        }
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(mockedVerifyToken).toHaveBeenCalledWith('clerk-token', {
            secretKey: 'secret',
            authorizedParties: ['https://board-vault.com', 'http://localhost:4200'],
        })
        expect(request.user).toEqual({
            userId: 7,
            email: 'person@example.com',
            isAdmin: true,
            clerkUserId: 'user_clerk_123',
            authProvider: 'clerk',
        })
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('does not resolve auth routes because the dedicated auth guards own them', async () => {
        const request = { path: '/auth/clerk/status', headers: { authorization: 'Bearer clerk-token' } } as {
            path: string
            headers: { authorization?: string }
            user?: unknown
        }
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(mockedVerifyToken).not.toHaveBeenCalled()
        expect(clerkIdentityService.resolveAccount).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('leaves an invalid or unlinked session for the protected guard to reject', async () => {
        mockedVerifyToken.mockRejectedValue(new Error('invalid token'))
        const request = { path: '/profile/users/7', headers: { authorization: 'Bearer invalid-token' } } as {
            path: string
            headers: { authorization?: string }
            user?: unknown
        }
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(request.user).toBeUndefined()
        expect(next).toHaveBeenCalledTimes(1)
    })
})
