import { ConflictException, ExecutionContext, UnauthorizedException } from '@nestjs/common'

import { AuthGuard } from './auth.guard'

describe('AuthGuard', () => {
    const guard = new AuthGuard()
    const contextFor = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext

    it('allows a request that the session middleware authenticated', () => {
        expect(guard.canActivate(contextFor({ user: { userId: 7 } }))).toBe(true)
    })

    it('rejects a request without a session', () => {
        expect(() => guard.canActivate(contextFor({}))).toThrow(UnauthorizedException)
    })

    it('reports the account resolution error instead of a generic 401', () => {
        const error = new ConflictException('This email already belongs to another Board Vault account')

        expect(() => guard.canActivate(contextFor({ authError: error }))).toThrow(error)
    })
})
