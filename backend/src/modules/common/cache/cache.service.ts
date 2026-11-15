import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Redis } from '@upstash/redis'

import { safeErrorName, structuredLog } from '../../../common/logging/structured-log.js'
import { PrintKeysDto } from '../../../common/types/cache.type.js'

import { CACHE_TTL } from './cache.types.js'

const REDIS_REQUEST_TIMEOUT_MS = 250
const REDIS_FAILURE_COOLDOWN_MS = 30_000
/** Rate-limit counts run on almost every request; only those this slow (or first on an instance) are logged. */
const SLOW_REDIS_REQUEST_MS = 100

/** Keys of `RateLimitGuard`; they share the Redis with the cache. */
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit:'
const CLEAR_SCAN_COUNT = 500

/**
 * This decorator wraps all the methods providing:
 * - A default response in case of redis being disabled in .env
 * - Error catching wrapping the method
 * - One `cache.request.completed` or `cache.request.failed` line per call, with how long Redis took
 *
 * @param response_on_error If not provided, it will return null
 * @param options.logCompletedFromMs Log a completed call only from this many milliseconds, or when it is the
 * instance's first request. For methods called on almost every request (rate limits), so their lines stay rare.
 * Failures are always logged.
 */
function Wrapper(response_on_error: unknown = null, options: { logCompletedFromMs?: number } = {}) {
    return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        const LOGGER = new Logger(target.constructor.name)

        descriptor.value = async function (this: unknown, ...args: unknown[]) {
            const service = this as {
                REDIS_DISABLED?: boolean
                REDIS_UNAVAILABLE_UNTIL?: number
                LOGGER?: Logger
            }
            const logger = service.LOGGER ?? LOGGER

            // Before running any method, check if redis is disabled
            if (service.REDIS_DISABLED) {
                logger.warn(`[${propertyKey}] Redis is disabled`)
                return response_on_error
            }

            if ((service.REDIS_UNAVAILABLE_UNTIL ?? 0) > Date.now()) {
                return response_on_error
            }

            const timing = startRedisRequest(service, propertyKey)

            // Wraps the method, catching any error
            try {
                const result = await originalMethod.apply(this, args)
                const fields = timing.fields()
                const quietBelowMs = options.logCompletedFromMs

                if (quietBelowMs === undefined || fields.firstOnInstance || fields.durationMs >= quietBelowMs) {
                    logger.log(structuredLog('cache.request.completed', fields))
                }
                return result
            } catch (err) {
                // Cache and rate limits stay off on this instance for the cooldown.
                service.REDIS_UNAVAILABLE_UNTIL = Date.now() + REDIS_FAILURE_COOLDOWN_MS
                logger.error(structuredLog('cache.request.failed', { ...timing.fields(), errorName: safeErrorName(err) }))
                return response_on_error
            }
        }
    }
}

/** How many Redis requests each `CacheService` instance has made. */
const redisRequestsMade = new WeakMap<object, number>()

/**
 * Times one Redis request for its log line. `firstOnInstance` marks the first request a server instance makes,
 * the one that also opens the TLS connection to Upstash, so cold starts can be told apart from warm requests (#255).
 */
function startRedisRequest(service: object, operation: string) {
    const startedAt = performance.now()
    const made = redisRequestsMade.get(service) ?? 0
    const firstOnInstance = made === 0

    redisRequestsMade.set(service, made + 1)

    return {
        fields: () => ({ operation, durationMs: Math.round(performance.now() - startedAt), firstOnInstance }),
    }
}

@Injectable()
export class CacheService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly REDIS: Redis | null
    private readonly REDIS_DISABLED: boolean
    private REDIS_UNAVAILABLE_UNTIL = 0

    constructor(configService: ConfigService) {
        this.REDIS_DISABLED = configService.get<string>('UPSTASH_REDIS_REST_DISABLE') === 'true'
        this.REDIS = this.REDIS_DISABLED
            ? null
            : Redis.fromEnv({
                  retry: false,
                  signal: () => AbortSignal.timeout(REDIS_REQUEST_TIMEOUT_MS),
              })
    }

    // #region endpoints
    /**
     * /database/print
     */
    // Key inspection is diagnostic only: a provider failure answers an empty list (the Wrapper's default and its
    // `cache.request.failed` line), never a destructive flush of cache and rate-limit state.
    @Wrapper({ total: 0, keys: [] })
    async keys(): Promise<PrintKeysDto> {
        const keys = await this.REDIS!.keys('*')

        this.LOGGER.log('REDIS: Cache key inspection completed')
        return { total: keys.length, keys }
    }

    /**
     * /database/reset
     */
    @Wrapper(false)
    async deleteAll(): Promise<boolean> {
        await this.REDIS!.keys('*')

        this.LOGGER.log('REDIS: Deleting all cache entries')
        await this.REDIS!.flushdb()
        return true
    }

    /**
     * Clears every cached view, but keeps the rate-limit counters stored in the same Redis, so
     * clearing never lets anyone send more requests than allowed. False when nothing could be cleared.
     */
    @Wrapper(false)
    async deleteCachedData(): Promise<boolean> {
        let cursor = '0'

        do {
            const [next, keys] = await this.REDIS!.scan(cursor, { count: CLEAR_SCAN_COUNT })
            const cached = keys.filter(key => !key.startsWith(RATE_LIMIT_KEY_PREFIX))

            if (cached.length > 0) await this.REDIS!.del(...cached)
            cursor = String(next)
        } while (cursor !== '0')

        this.LOGGER.log('REDIS: Cleared cached entries; rate limits kept')
        return true
    }

    /**
     * /database/delete/:key
     */
    @Wrapper(false)
    async deleteOne(key: string): Promise<boolean> {
        this.LOGGER.log('REDIS: Deleting single cache key...')
        await this.REDIS!.del(key)
        return true
    }

    // #region non-endpoints
    /** False when Redis is turned off in `.env`, as in local development and tests. */
    isEnabled(): boolean {
        return !this.REDIS_DISABLED
    }

    async checkHealth(): Promise<'up' | 'down' | 'disabled'> {
        if (this.REDIS_DISABLED) {
            return 'disabled'
        }

        if (this.REDIS_UNAVAILABLE_UNTIL > Date.now()) {
            return 'down'
        }

        const timing = startRedisRequest(this, 'ping')

        try {
            await this.REDIS!.ping()
            this.LOGGER.log(structuredLog('cache.request.completed', timing.fields()))
            return 'up'
        } catch (error) {
            this.REDIS_UNAVAILABLE_UNTIL = Date.now() + REDIS_FAILURE_COOLDOWN_MS
            this.LOGGER.error(structuredLog('cache.request.failed', { ...timing.fields(), errorName: safeErrorName(error) }))
            return 'down'
        }
    }

    /**
     * @param ttl - recommended TTLs:
     * - short: 1 hour - for data that the user may frequently update (wishlist, reviews, etc)
     * - medium: 6 hours - for more static data (group member data, etc)
     * - long: 1 day - for data that is not updated frequently (game translations, etc)
     * @default short
     */
    @Wrapper()
    async set(key: string, data: unknown, ttl: keyof typeof CACHE_TTL = 'short'): Promise<void> {
        await this.REDIS!.set(key, data, { ex: CACHE_TTL[ttl] })
    }

    /**
     * Returns the stored JSON, or null. Typed `any` on purpose: callers read the
     * shape they stored under their own key, and those that need a guarantee
     * re-validate it (for example `_validateSchema([cached])`).
     */
    @Wrapper()
    async get(key: string): Promise<any> {
        return await this.REDIS!.get(key)
    }

    @Wrapper(null, { logCompletedFromMs: SLOW_REDIS_REQUEST_MS })
    async increment(key: string, ttlSeconds: number): Promise<number | null> {
        const count = await this.REDIS!.incr(key)

        if (count === 1) {
            await this.REDIS!.expire(key, ttlSeconds)
        }

        return count
    }
}
