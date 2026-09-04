import { ExecutionContext, ForbiddenException } from '@nestjs/common'

import { DatabaseService } from '../../modules/common/database/database.service'

import { VerifiedUserGuard } from './verified-user.guard'

describe('VerifiedUserGuard', () => {
    const createContext = (user?: Record<string, unknown>) =>
        ({
            switchToHttp: () => ({ getRequest: () => ({ user }) }),
        }) as unknown as ExecutionContext

    it('rejects requests without an authenticated user', async () => {
        const guard = new VerifiedUserGuard({ getUserById: jest.fn() } as unknown as DatabaseService)

        await expect(guard.canActivate(createContext())).resolves.toBe(false)
    })

    it('rejects an unverified legacy account', async () => {
        const getUserById = jest.fn().mockResolvedValue({ rows: [{ email_verified: false }] })
        const guard = new VerifiedUserGuard({ getUserById } as unknown as DatabaseService)

        await expect(guard.canActivate(createContext({ userId: 7 }))).rejects.toThrow(ForbiddenException)
        expect(getUserById).toHaveBeenCalledWith(7)
    })

    it('allows a verified legacy account', async () => {
        const getUserById = jest.fn().mockResolvedValue({ rows: [{ email_verified: true }] })
        const guard = new VerifiedUserGuard({ getUserById } as unknown as DatabaseService)

        await expect(guard.canActivate(createContext({ userId: 7 }))).resolves.toBe(true)
    })

    it('allows a Clerk identity without a legacy verification lookup', async () => {
        const getUserById = jest.fn()
        const guard = new VerifiedUserGuard({ getUserById } as unknown as DatabaseService)

        await expect(guard.canActivate(createContext({ userId: 7, authProvider: 'clerk' }))).resolves.toBe(true)
        expect(getUserById).not.toHaveBeenCalled()
    })
})
