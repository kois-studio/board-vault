import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { CacheService } from '../../modules/common/cache/cache.service'

import { RateLimitGuard } from './rate-limit.guard'

describe('RateLimitGuard', () => {
    const createContext = (): ExecutionContext =>
        ({
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({
                getRequest: () => ({ ip: '127.0.0.1', route: { path: '/auth/login' } }),
            }),
        }) as unknown as ExecutionContext

    it('allows requests while Redis is unavailable in local disabled mode', async () => {
        const cacheService = { increment: jest.fn().mockResolvedValue(null) }
        const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
        const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)

        await expect(guard.canActivate(createContext())).resolves.toBe(true)
    })

    it('rejects requests above the configured limit', async () => {
        const cacheService = { increment: jest.fn().mockResolvedValue(3) }
        const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
        const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)

        await expect(guard.canActivate(createContext())).rejects.toThrow('Too many requests')
    })
})
