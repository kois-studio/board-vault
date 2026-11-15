import { CacheService } from './cache.service.js'

import type { Mock } from 'vitest'

type CacheServiceInternals = {
    LOGGER: { log: Mock; error: Mock; warn: Mock }
    REDIS: { get: Mock; set: Mock; incr: Mock; expire: Mock; keys: Mock; flushdb: Mock; ping: Mock; scan: Mock; del: Mock }
}

/** The structured lines a logger mock received, parsed. */
const lines = (mock: Mock) => mock.mock.calls.map(([message]) => JSON.parse(String(message)) as Record<string, unknown>)

describe('CacheService logging', () => {
    const createService = () => {
        const service = Object.create(CacheService.prototype) as CacheService
        const internals = service as unknown as CacheServiceInternals

        internals.LOGGER = { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
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
        expect(lines(internals.LOGGER.log).map(line => line.operation)).toEqual(['set', 'get'])
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
        expect(internals.LOGGER.log).not.toHaveBeenCalled()
        expect(lines(internals.LOGGER.error)).toEqual([
            { event: 'cache.request.failed', operation: 'keys', durationMs: expect.any(Number), firstOnInstance: true, errorName: 'Error' },
        ])
    })

    it('reports a provider outage and avoids repeated health probes during cooldown', async () => {
        const { service, internals } = createService()

        internals.REDIS.ping.mockRejectedValueOnce(new Error('Redis unavailable'))

        await expect(service.checkHealth()).resolves.toBe('down')
        await expect(service.checkHealth()).resolves.toBe('down')

        expect(internals.REDIS.ping).toHaveBeenCalledTimes(1)
        expect(lines(internals.LOGGER.error)).toEqual([
            { event: 'cache.request.failed', operation: 'ping', durationMs: expect.any(Number), firstOnInstance: true, errorName: 'Error' },
        ])
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

    // `performance.now` is read twice per request, at the start and at the end, so each mocked pair is one request.
    describe('how long Redis took (#255)', () => {
        afterEach(() => vi.restoreAllMocks())

        it('logs one line per request with the operation and its duration in milliseconds', async () => {
            const { service, internals } = createService()

            vi.spyOn(performance, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_137.4)
            await service.get('games:byId:7')

            expect(lines(internals.LOGGER.log)).toEqual([
                { event: 'cache.request.completed', operation: 'get', durationMs: 137, firstOnInstance: true },
            ])
        })

        it("marks only the instance's first request, the one that opens the connection", async () => {
            const { service, internals } = createService()

            await service.get('games:byId:7')
            await service.set('games:byId:7', { id: 7 })
            await service.checkHealth()

            expect(lines(internals.LOGGER.log).map(line => [line.operation, line.firstOnInstance])).toEqual([
                ['get', true],
                ['set', false],
                ['ping', false],
            ])
        })

        it('does not count a request skipped during the cooldown as the first one', async () => {
            const { service, internals } = createService()
            const state = service as unknown as { REDIS_UNAVAILABLE_UNTIL: number }

            state.REDIS_UNAVAILABLE_UNTIL = Date.now() + 60_000
            await expect(service.get('games:byId:7')).resolves.toBeNull()
            state.REDIS_UNAVAILABLE_UNTIL = 0
            await service.get('games:byId:7')

            expect(internals.REDIS.get).toHaveBeenCalledTimes(1)
            expect(lines(internals.LOGGER.log).map(line => line.firstOnInstance)).toEqual([true])
        })

        it('logs a rate-limit count only when it is slow or the first on the instance, and always when it fails', async () => {
            const { service, internals } = createService()

            internals.REDIS.incr.mockResolvedValue(2)
            vi.spyOn(performance, 'now')
                .mockReturnValueOnce(0) // first on the instance, fast: logged
                .mockReturnValueOnce(12)
                .mockReturnValueOnce(100) // warm and fast: quiet
                .mockReturnValueOnce(130)
                .mockReturnValueOnce(200) // warm and slow (two round trips on a new window): logged
                .mockReturnValueOnce(310)
                .mockReturnValueOnce(400) // warm and failed: logged
                .mockReturnValueOnce(651)

            await service.increment('rate-limit:hash', 60)
            await service.increment('rate-limit:hash', 60)
            internals.REDIS.incr.mockResolvedValueOnce(1)
            await service.increment('rate-limit:hash', 60)
            internals.REDIS.incr.mockRejectedValueOnce(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
            await expect(service.increment('rate-limit:hash', 60)).resolves.toBeNull()

            expect(internals.REDIS.incr).toHaveBeenCalledTimes(4)
            expect(lines(internals.LOGGER.log)).toEqual([
                { event: 'cache.request.completed', operation: 'increment', durationMs: 12, firstOnInstance: true },
                { event: 'cache.request.completed', operation: 'increment', durationMs: 110, firstOnInstance: false },
            ])
            expect(lines(internals.LOGGER.error)).toEqual([
                {
                    event: 'cache.request.failed',
                    operation: 'increment',
                    durationMs: 251,
                    firstOnInstance: false,
                    errorName: 'TimeoutError',
                },
            ])
        })

        it('logs a failed request with its duration and error name, then nothing during the cooldown', async () => {
            const { service, internals } = createService()

            internals.REDIS.get.mockRejectedValueOnce(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
            vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(251)

            await expect(service.get('games:byId:7')).resolves.toBeNull()
            await expect(service.set('games:byId:7', { id: 7 })).resolves.toBeNull()

            expect(internals.LOGGER.log).not.toHaveBeenCalled()
            expect(lines(internals.LOGGER.error)).toEqual([
                { event: 'cache.request.failed', operation: 'get', durationMs: 251, firstOnInstance: true, errorName: 'TimeoutError' },
            ])
            expect(internals.REDIS.set).not.toHaveBeenCalled()
        })

        it('times the health check', async () => {
            const { service, internals } = createService()

            vi.spyOn(performance, 'now').mockReturnValueOnce(50).mockReturnValueOnce(71.6)

            await expect(service.checkHealth()).resolves.toBe('up')
            expect(lines(internals.LOGGER.log)).toEqual([
                { event: 'cache.request.completed', operation: 'ping', durationMs: 22, firstOnInstance: true },
            ])
        })

        it('logs no timing while Redis is turned off', async () => {
            const service = new CacheService({ get: vi.fn().mockReturnValue('true') } as never)
            const logger = { log: vi.fn(), error: vi.fn(), warn: vi.fn() }

            ;(service as unknown as CacheServiceInternals).LOGGER = logger
            await service.get('games:byId:7')

            expect(logger.log).not.toHaveBeenCalled()
            expect(logger.warn).toHaveBeenCalledWith('[get] Redis is disabled')
        })

        it('never writes a key or a value into a timing line, even for a rate-limit bucket', async () => {
            const { service, internals } = createService()

            internals.REDIS.incr.mockRejectedValueOnce(new Error('rate-limit:secret-hash unavailable'))
            await service.increment('rate-limit:secret-hash', 60)
            await service.checkHealth()

            const written = [...internals.LOGGER.log.mock.calls, ...internals.LOGGER.error.mock.calls].flat().join(' ')

            expect(written).not.toContain('secret-hash')
            expect(written).not.toContain('unavailable')
        })
    })

    it('knows when Redis is turned off', () => {
        expect(new CacheService({ get: vi.fn().mockReturnValue('true') } as never).isEnabled()).toBe(false)
        expect(createService().service.isEnabled()).toBe(true)
    })
})
