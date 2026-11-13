import { createHash } from 'node:crypto'

import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { CacheService } from '../../modules/common/cache/cache.service.js'

import { RateLimitGuard } from './rate-limit.guard.js'

describe('RateLimitGuard', () => {
    const createContext = (request: object = { ip: '127.0.0.1', route: { path: '/invitations/byUsername' } }): ExecutionContext =>
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
        const route = { path: '/invitations/byUsername' }

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

    describe('with RATE_LIMIT_KEY_SECRET (#321)', () => {
        const saved = process.env.RATE_LIMIT_KEY_SECRET
        const route = { path: '/problems' }

        afterEach(() => {
            if (saved === undefined) {
                delete process.env.RATE_LIMIT_KEY_SECRET
            } else {
                process.env.RATE_LIMIT_KEY_SECRET = saved
            }
            vi.useRealTimers()
        })

        const keyFor = async (request: object): Promise<string> => {
            const cacheService = { increment: vi.fn().mockResolvedValue(1) }
            const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ limit: 2, windowSeconds: 60 }) }
            const guard = new RateLimitGuard(cacheService as unknown as CacheService, reflector as unknown as Reflector)

            await guard.canActivate(createContext(request))

            return cacheService.increment.mock.calls[0][0] as string
        }

        it('stores a key that the endpoint, caller and window alone do not give away', async () => {
            vi.useFakeTimers({ now: 1_800_000_000_000 })
            process.env.RATE_LIMIT_KEY_SECRET = 'secret-a'
            const bucket = Math.floor(Date.now() / 1000 / 60)
            const plain = createHash('sha256').update(`/problems:ip:203.0.113.7:${bucket}`).digest('hex')

            const key = await keyFor({ ip: '203.0.113.7', route })

            expect(key).toMatch(/^rate-limit:[0-9a-f]{64}$/)
            expect(key).not.toContain(plain)
            expect(key).not.toContain('203.0.113.7')
        })

        it('keeps one counter per caller and window, and a new secret starts new counters', async () => {
            vi.useFakeTimers({ now: 1_800_000_000_000 })
            process.env.RATE_LIMIT_KEY_SECRET = 'secret-a'
            const first = await keyFor({ ip: '203.0.113.7', route })
            const again = await keyFor({ ip: '203.0.113.7', route })

            process.env.RATE_LIMIT_KEY_SECRET = 'secret-b'
            const rotated = await keyFor({ ip: '203.0.113.7', route })

            expect(again).toBe(first)
            expect(rotated).not.toBe(first)
        })
    })
})
