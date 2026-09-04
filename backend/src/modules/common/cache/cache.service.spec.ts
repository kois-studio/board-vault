import { CacheService } from './cache.service'

type CacheServiceInternals = {
    LOGGER: { log: jest.Mock; error: jest.Mock }
    REDIS: { get: jest.Mock; set: jest.Mock; incr: jest.Mock; expire: jest.Mock; keys: jest.Mock; flushdb: jest.Mock }
}

describe('CacheService logging', () => {
    const createService = () => {
        const service = Object.create(CacheService.prototype) as CacheService
        const internals = service as unknown as CacheServiceInternals

        internals.LOGGER = { log: jest.fn(), error: jest.fn() }
        internals.REDIS = {
            get: jest.fn().mockResolvedValue({ email: 'person@example.com' }),
            set: jest.fn().mockResolvedValue('OK'),
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
            keys: jest.fn().mockResolvedValue([]),
            flushdb: jest.fn().mockResolvedValue('OK'),
        }
        return { service, internals }
    }

    it('does not log cache keys or serialized payloads', async () => {
        const { service, internals } = createService()

        await service.set('user:7:profile', { email: 'person@example.com' }, 'short')
        await service.get('user:7:profile')

        expect(internals.REDIS.set).toHaveBeenCalledWith('user:7:profile', { email: 'person@example.com' }, { ex: 3600 })
        expect(internals.REDIS.get).toHaveBeenCalledWith('user:7:profile')
        expect(internals.LOGGER.log).toHaveBeenCalledWith('REDIS: set cache value with 3600s TTL')
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
})
