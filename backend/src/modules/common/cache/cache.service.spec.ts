import { CacheService } from './cache.service'

type CacheServiceInternals = {
    LOGGER: { log: jest.Mock }
    REDIS: { get: jest.Mock; set: jest.Mock; incr: jest.Mock; expire: jest.Mock }
}

describe('CacheService logging', () => {
    const createService = () => {
        const service = Object.create(CacheService.prototype) as CacheService
        const internals = service as unknown as CacheServiceInternals
        internals.LOGGER = { log: jest.fn() }
        internals.REDIS = {
            get: jest.fn().mockResolvedValue({ email: 'person@example.com' }),
            set: jest.fn().mockResolvedValue('OK'),
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
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
})
