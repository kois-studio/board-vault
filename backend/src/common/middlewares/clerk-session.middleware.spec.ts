import { ConflictException } from '@nestjs/common'

import { AccountCache } from '../../modules/common/auth/account-cache.js'
import { ProviderTimeoutError } from '../http/provider-timeout.js'

import { ClerkSessionMiddleware } from './clerk-session.middleware.js'

describe('ClerkSessionMiddleware', () => {
    const tokenVerifier = { verify: vi.fn() }
    const clerkIdentityService = { resolveAccount: vi.fn() }
    let middleware: ClerkSessionMiddleware
    const requestWith = (authorization?: string) =>
        ({ headers: authorization ? { authorization } : {} }) as {
            headers: { authorization?: string }
            user?: unknown
            authError?: unknown
        }

    beforeEach(() => {
        tokenVerifier.verify.mockReset()
        clerkIdentityService.resolveAccount.mockReset()
        middleware = new ClerkSessionMiddleware(tokenVerifier as never, clerkIdentityService as never, new AccountCache())
    })

    it('attaches the local account behind a verified Clerk token', async () => {
        tokenVerifier.verify.mockResolvedValue('user_clerk_123')
        clerkIdentityService.resolveAccount.mockResolvedValue({ id: 7, email: 'person@example.test', isAdmin: true })
        const request = requestWith('Bearer clerk-token')
        const next = vi.fn()

        await middleware.use(request as never, {} as never, next)

        expect(tokenVerifier.verify).toHaveBeenCalledWith('clerk-token')
        expect(request.user).toEqual({ userId: 7, email: 'person@example.test', isAdmin: true, clerkUserId: 'user_clerk_123' })
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('resolves the account once for the requests of the next minute (#250)', async () => {
        tokenVerifier.verify.mockResolvedValue('user_clerk_123')
        clerkIdentityService.resolveAccount.mockResolvedValue({ id: 7, email: 'person@example.test', isAdmin: false, locale: 'es' })
        const requests = Array.from({ length: 5 }, () => requestWith('Bearer clerk-token'))

        await Promise.all(requests.map(request => middleware.use(request as never, {} as never, vi.fn())))
        await middleware.use(requestWith('Bearer clerk-token') as never, {} as never, vi.fn())

        expect(clerkIdentityService.resolveAccount).toHaveBeenCalledTimes(1)
        // Every request still checks its own token: only the account behind it is remembered.
        expect(tokenVerifier.verify).toHaveBeenCalledTimes(6)
        for (const request of requests) {
            expect(request.user).toEqual({ userId: 7, email: 'person@example.test', isAdmin: false, clerkUserId: 'user_clerk_123' })
        }
    })

    it('resolves the account again after a failure', async () => {
        const error = new ProviderTimeoutError('clerk')

        tokenVerifier.verify.mockResolvedValue('user_clerk_123')
        clerkIdentityService.resolveAccount
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce({ id: 7, email: 'person@example.test', isAdmin: false })
        const failed = requestWith('Bearer clerk-token')
        const retried = requestWith('Bearer clerk-token')

        await middleware.use(failed as never, {} as never, vi.fn())
        await middleware.use(retried as never, {} as never, vi.fn())

        expect(failed.authError).toBe(error)
        expect(retried.user).toEqual({ userId: 7, email: 'person@example.test', isAdmin: false, clerkUserId: 'user_clerk_123' })
    })

    it('leaves requests without a bearer token anonymous', async () => {
        const request = requestWith()
        const next = vi.fn()

        await middleware.use(request as never, {} as never, next)

        expect(tokenVerifier.verify).not.toHaveBeenCalled()
        expect(request.user).toBeUndefined()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('leaves invalid tokens anonymous without resolving an account', async () => {
        tokenVerifier.verify.mockResolvedValue(null)
        const request = requestWith('Bearer expired-token')
        const next = vi.fn()

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
        const next = vi.fn()

        await middleware.use(request as never, {} as never, next)

        expect(request.user).toBeUndefined()
        expect(request.authError).toBe(error)
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('keeps a Clerk timeout for the guard instead of failing the request', async () => {
        const error = new ProviderTimeoutError('clerk')

        tokenVerifier.verify.mockRejectedValue(error)
        const request = requestWith('Bearer clerk-token')
        const next = vi.fn()

        await middleware.use(request as never, {} as never, next)

        expect(request.user).toBeUndefined()
        expect(request.authError).toBe(error)
        expect(next).toHaveBeenCalledTimes(1)
    })
})
