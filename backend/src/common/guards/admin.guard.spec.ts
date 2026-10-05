import { ExecutionContext, ForbiddenException } from '@nestjs/common'

import { AdminGuard } from './admin.guard.js'

const createContext = (user?: Record<string, unknown>): ExecutionContext =>
    ({
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as ExecutionContext

describe('AdminGuard', () => {
    it('allows an authenticated administrator', () => {
        expect(new AdminGuard().canActivate(createContext({ userId: 7, isAdmin: true }))).toBe(true)
    })

    it('denies a non-administrator', () => {
        expect(() => new AdminGuard().canActivate(createContext({ userId: 7, isAdmin: false }))).toThrow(ForbiddenException)
    })

    it('denies a missing authenticated user', () => {
        expect(() => new AdminGuard().canActivate(createContext())).toThrow(ForbiddenException)
    })
})
