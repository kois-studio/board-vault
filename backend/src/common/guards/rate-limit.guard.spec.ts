import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { CacheService } from '../../modules/common/cache/cache.service'

import { RateLimitGuard } from './rate-limit.guard'

describe('RateLimitGuard', () => {
    const createContext = (
        request: object = { ip: '127.0.0.1', route: { path: '/groups/:groupId/clerk-invitations' } },
    ): ExecutionContext =>
        ({
            getHandler: vi.fn(),
            getClass: vi.fn(),
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        }) as unknown as ExecutionContext

    it('allows requests while Redis is unavailable in local disabled mode', async () => {
        const cacheService = { increment: vi.fn().mockResolvedValue(null) }
        const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
        const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)

        await expect(guard.canActivate(createContext())).resolves.toBe(true)
    })

    it('rejects requests above the configured limit', async () => {
        const cacheService = { increment: vi.fn().mockResolvedValue(3) }
        const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
        const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)

        await expect(guard.canActivate(createContext())).rejects.toThrow('Too many requests')
    })

    it('shares one budget per signed-in account regardless of client address', async () => {
        const cacheService = { increment: vi.fn().mockResolvedValue(1) }
        const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
        const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)
        const route = { path: '/groups/:groupId/clerk-invitations' }

        await guard.canActivate(createContext({ ip: '10.0.0.1', user: { userId: 7 }, route }))
        await guard.canActivate(createContext({ ip: '10.0.0.2', user: { userId: 7 }, route }))
        await guard.canActivate(createContext({ ip: '10.0.0.1', user: { userId: 8 }, route }))

        const keys = cacheService.increment.mock.calls.map(([key]) => key)

        expect(keys[0]).toBe(keys[1])
        expect(keys[2]).not.toBe(keys[0])
    })

    it('keys anonymous callers by client address', async () => {
        const cacheService = { increment: vi.fn().mockResolvedValue(1) }
        const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
        const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)
        const route = { path: '/public' }

        await guard.canActivate(createContext({ ip: '10.0.0.1', route }))
        await guard.canActivate(createContext({ ip: '10.0.0.2', route }))

        const keys = cacheService.increment.mock.calls.map(([key]) => key)

        expect(keys[0]).not.toBe(keys[1])
    })
})
