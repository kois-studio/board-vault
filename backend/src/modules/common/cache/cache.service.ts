import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Redis } from '@upstash/redis'

import { PrintKeysDto } from '../../../common/types/cache.type.js'

import { CACHE_TTL } from './cache.types.js'

const REDIS_REQUEST_TIMEOUT_MS = 250
const REDIS_FAILURE_COOLDOWN_MS = 30_000

/** Keys of `RateLimitGuard`; they share the Redis with the cache. */
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit:'
const CLEAR_SCAN_COUNT = 500

/**
 * This decorator wraps all the methods providing:
 * - A default response in case of redis being disabled in .env
 * - Error catching wrapping the method
 *
 * @param response_on_error If not provided, it will return null
 */
function Wrapper(response_on_error: unknown = null) {
    return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        const LOGGER = new Logger(target.constructor.name)

        descriptor.value = async function (this: unknown, ...args: unknown[]) {
            const service = this as {
                REDIS_DISABLED?: boolean
                REDIS_UNAVAILABLE_UNTIL?: number
            }

            // Before running any method, check if redis is disabled
            if (service.REDIS_DISABLED) {
                LOGGER.warn(`[${propertyKey}] Redis is disabled`)
                return response_on_error
            }

            if ((service.REDIS_UNAVAILABLE_UNTIL ?? 0) > Date.now()) {
                return response_on_error
            }

            // Wraps the method, catching any error
            try {
                return await originalMethod.apply(this, args)
            } catch (err) {
                service.REDIS_UNAVAILABLE_UNTIL = Date.now() + REDIS_FAILURE_COOLDOWN_MS
                LOGGER.error(
                    `[${propertyKey}] Redis request failed; continuing without cache or rate limiting (${err instanceof Error ? err.name : 'unknown error'})`,
                )
                return response_on_error
            }
        }
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
    @Wrapper({ total: 0, keys: [] })
    async keys(): Promise<PrintKeysDto> {
        try {
            const keys = await this.REDIS!.keys('*')

            this.LOGGER.log('REDIS: Cache key inspection completed')
            return { total: keys.length, keys }
        } catch (err) {
            // Key inspection is diagnostic only. Never turn a provider failure
            // into a destructive flush of cache and rate-limit state.
            this.LOGGER.error(`REDIS: Error while getting keys (${err instanceof Error ? err.name : 'unknown error'})`)
            return { total: 0, keys: [] }
        }
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

        try {
            await this.REDIS!.ping()
            return 'up'
        } catch (error) {
            this.REDIS_UNAVAILABLE_UNTIL = Date.now() + REDIS_FAILURE_COOLDOWN_MS
            this.LOGGER.error(`Redis health check failed (${error instanceof Error ? error.name : 'unknown error'})`)
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
        this.LOGGER.log('REDIS: set cache value')

        await this.REDIS!.set(key, data, { ex: CACHE_TTL[ttl] })
    }

    /**
     * Returns the stored JSON, or null. Typed `any` on purpose: callers read the
     * shape they stored under their own key, and those that need a guarantee
     * re-validate it (for example `_validateSchema([cached])`).
     */
    @Wrapper()
    async get(key: string): Promise<any> {
        this.LOGGER.log('REDIS: get cache value')

        return await this.REDIS!.get(key)
    }

    @Wrapper(null)
    async increment(key: string, ttlSeconds: number): Promise<number | null> {
        const count = await this.REDIS!.incr(key)

        if (count === 1) {
            await this.REDIS!.expire(key, ttlSeconds)
        }

        return count
    }
}
