import { ConflictException } from '@nestjs/common'

import { ClerkSessionMiddleware } from './clerk-session.middleware'

describe('ClerkSessionMiddleware', () => {
    const tokenVerifier = { verify: jest.fn() }
    const clerkIdentityService = { resolveAccount: jest.fn() }
    const middleware = new ClerkSessionMiddleware(tokenVerifier as never, clerkIdentityService as never)
    const requestWith = (authorization?: string) =>
        ({ headers: authorization ? { authorization } : {} }) as {
            headers: { authorization?: string }
            user?: unknown
            authError?: unknown
        }

    beforeEach(() => {
        tokenVerifier.verify.mockReset()
        clerkIdentityService.resolveAccount.mockReset()
    })

    it('attaches the local account behind a verified Clerk token', async () => {
        tokenVerifier.verify.mockResolvedValue('user_clerk_123')
        clerkIdentityService.resolveAccount.mockResolvedValue({ id: 7, email: 'person@example.test', isAdmin: true })
        const request = requestWith('Bearer clerk-token')
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(tokenVerifier.verify).toHaveBeenCalledWith('clerk-token')
        expect(request.user).toEqual({ userId: 7, email: 'person@example.test', isAdmin: true, clerkUserId: 'user_clerk_123' })
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('leaves requests without a bearer token anonymous', async () => {
        const request = requestWith()
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(tokenVerifier.verify).not.toHaveBeenCalled()
        expect(request.user).toBeUndefined()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('leaves invalid tokens anonymous without resolving an account', async () => {
        tokenVerifier.verify.mockResolvedValue(null)
        const request = requestWith('Bearer expired-token')
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(clerkIdentityService.resolveAccount).not.toHaveBeenCalled()
        expect(request.user).toBeUndefined()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('keeps account resolution errors for the guard', async () => {
        const error = new ConflictException('This email already belongs to another Board Vault account')

        tokenVerifier.verify.mockResolvedValue('user_clerk_123')
        clerkIdentityService.resolveAccount.mockRejectedValue(error)
        const request = requestWith('Bearer clerk-token')
        const next = jest.fn()

        await middleware.use(request as never, {} as never, next)

        expect(request.user).toBeUndefined()
        expect(request.authError).toBe(error)
        expect(next).toHaveBeenCalledTimes(1)
    })
})
