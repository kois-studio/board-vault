import { CacheService } from './cache.service.js'

import type { Mock } from 'vitest'

type CacheServiceInternals = {
    LOGGER: { log: Mock; error: Mock }
    REDIS: { get: Mock; set: Mock; incr: Mock; expire: Mock; keys: Mock; flushdb: Mock; ping: Mock; scan: Mock; del: Mock }
}

describe('CacheService logging', () => {
    const createService = () => {
        const service = Object.create(CacheService.prototype) as CacheService
        const internals = service as unknown as CacheServiceInternals

        internals.LOGGER = { log: vi.fn(), error: vi.fn() }
        internals.REDIS = {
            get: vi.fn().mockResolvedValue({ email: 'person@example.com' }),
            set: vi.fn().mockResolvedValue('OK'),
            incr: vi.fn().mockResolvedValue(1),
            expire: vi.fn().mockResolvedValue(1),
            keys: vi.fn().mockResolvedValue([]),
            flushdb: vi.fn().mockResolvedValue('OK'),
            ping: vi.fn().mockResolvedValue('PONG'),
            scan: vi.fn().mockResolvedValue(['0', []]),
            del: vi.fn().mockImplementation(async (...keys: Array<string>) => keys.length),
        }
        return { service, internals }
    }

    it('has deterministic disabled-cache behavior without constructing a Redis client', async () => {
        const configService = { get: vi.fn().mockReturnValue('true') }
        const service = new CacheService(configService as never)

        await expect(service.get('games:byId:7')).resolves.toBeNull()
        await expect(service.set('games:byId:7', { id: 7 })).resolves.toBeNull()
        await expect(service.increment('rate-limit:hash', 60)).resolves.toBeNull()
        await expect(service.checkHealth()).resolves.toBe('disabled')
    })

    it('does not log cache keys or serialized payloads', async () => {
        const { service, internals } = createService()

        await service.set('user:7:profile', { email: 'person@example.com' }, 'short')
        await service.get('user:7:profile')

        expect(internals.REDIS.set).toHaveBeenCalledWith('user:7:profile', { email: 'person@example.com' }, { ex: 3600 })
        expect(internals.REDIS.get).toHaveBeenCalledWith('user:7:profile')
        expect(internals.LOGGER.log).toHaveBeenCalledWith('REDIS: set cache value')
        expect(internals.LOGGER.log).toHaveBeenCalledWith('REDIS: get cache value')
        expect(internals.LOGGER.log).not.toHaveBeenCalledWith(expect.stringContaining('user:7:profile'))
        expect(internals.LOGGER.log).not.toHaveBeenCalledWith(expect.stringContaining('person@example.com'))
    })

    it('increments a rate-limit bucket and applies its expiry without logging the key', async () => {
        const { service, internals } = createService()

        await expect(service.increment('rate-limit:secret-hash', 60)).resolves.toBe(1)

        expect(internals.REDIS.incr).toHaveBeenCalledWith('rate-limit:secret-hash')
        expect(internals.REDIS.expire).toHaveBeenCalledWith('rate-limit:secret-hash', 60)
        expect(internals.LOGGER.log).not.toHaveBeenCalledWith(expect.stringContaining('secret-hash'))
    })

    it('stops retrying Redis after a failed request during the cooldown window', async () => {
        const { service, internals } = createService()

        internals.REDIS.get.mockRejectedValueOnce(new Error('Redis unavailable'))

        await expect(service.get('games:byId:7')).resolves.toBeNull()
        await expect(service.get('games:byId:8')).resolves.toBeNull()

        expect(internals.REDIS.get).toHaveBeenCalledTimes(1)
    })

    it('does not flush cache state when key inspection fails', async () => {
        const { service, internals } = createService()

        internals.REDIS.keys.mockRejectedValueOnce(new Error('Redis unavailable'))

        await expect(service.keys()).resolves.toEqual({ total: 0, keys: [] })

        expect(internals.REDIS.flushdb).not.toHaveBeenCalled()
        expect(internals.LOGGER.error).toHaveBeenCalledWith('REDIS: Error while getting keys (Error)')
    })

    it('reports a provider outage and avoids repeated health probes during cooldown', async () => {
        const { service, internals } = createService()

        internals.REDIS.ping.mockRejectedValueOnce(new Error('Redis unavailable'))

        await expect(service.checkHealth()).resolves.toBe('down')
        await expect(service.checkHealth()).resolves.toBe('down')

        expect(internals.REDIS.ping).toHaveBeenCalledTimes(1)
        expect(internals.LOGGER.error).toHaveBeenCalledWith('Redis health check failed (Error)')
    })

    it('clears cached views page by page, but keeps the rate-limit counters', async () => {
        const { service, internals } = createService()

        internals.REDIS.scan
            .mockResolvedValueOnce(['17', ['reviews:userReviewsWithGameData:7', 'rate-limit:abc', 'dashboard:stats:7']])
            .mockResolvedValueOnce(['0', ['rate-limit:def', 'games:byId:3']])

        await expect(service.deleteCachedData()).resolves.toBe(true)

        expect(internals.REDIS.scan).toHaveBeenNthCalledWith(1, '0', { count: 500 })
        expect(internals.REDIS.scan).toHaveBeenNthCalledWith(2, '17', { count: 500 })
        expect(internals.REDIS.del.mock.calls).toEqual([['reviews:userReviewsWithGameData:7', 'dashboard:stats:7'], ['games:byId:3']])
        expect(internals.REDIS.flushdb).not.toHaveBeenCalled()
        expect(internals.LOGGER.log).toHaveBeenCalledWith('REDIS: Cleared cached entries; rate limits kept')
    })

    it('says so when the cache could not be cleared, instead of failing the caller', async () => {
        const { service, internals } = createService()

        internals.REDIS.scan.mockRejectedValueOnce(new Error('Redis unavailable'))

        await expect(service.deleteCachedData()).resolves.toBe(false)
        expect(internals.REDIS.del).not.toHaveBeenCalled()
    })

    it('knows when Redis is turned off', () => {
        expect(new CacheService({ get: vi.fn().mockReturnValue('true') } as never).isEnabled()).toBe(false)
        expect(createService().service.isEnabled()).toBe(true)
    })
})
