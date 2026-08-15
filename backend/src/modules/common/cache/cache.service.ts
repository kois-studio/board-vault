import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Redis } from '@upstash/redis'

import { PrintKeysDto } from '../../../common/types/cache.type'

import { CACHE_TTL } from './cache.types'

let is_redis_disabled = false

/**
 * This decorator wraps all the methods providing:
 * - A default response in case of redis being disabled in .env
 * - Error catching wrapping the method
 *
 * @param response_on_error If not provided, it will return null
 */
function Wrapper(response_on_error: any = null) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        const LOGGER = new Logger(target.constructor.name)

        descriptor.value = async function (...args: any[]) {
            // Before running any method, check if redis is disabled
            if (is_redis_disabled) {
                LOGGER.warn(`[${propertyKey}] Redis is disabled`)
                return response_on_error
            }

            // Wraps the method, catching any error
            try {
                return await originalMethod.apply(this, args)
            } catch (err) {
                LOGGER.error(`[${propertyKey}] Error with Redis!`, err)
                return response_on_error
            }
        }
    }
}

@Injectable()
export class CacheService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly REDIS: Redis = Redis.fromEnv()
    private readonly REDIS_DISABLED: boolean = false

    constructor(private readonly configService: ConfigService) {
        this.REDIS_DISABLED = configService.get<string>('UPSTASH_REDIS_REST_DISABLE') === 'true'
        is_redis_disabled = this.REDIS_DISABLED
    }

    // #region endpoints
    /**
     * /database/print
     */
    @Wrapper({ total: 0, keys: [] })
    async keys(): Promise<PrintKeysDto> {
        try {
            const keys = await this.REDIS.keys('*')

            this.LOGGER.log(`REDIS: Found ${keys.length} keys!`)
            return { total: keys.length, keys }
        } catch (err) {
            // If keys() fails, probably is because the redis keys exceeded the limit
            // For now there is no intention to implement scan(), so just delete all keys
            this.LOGGER.error('REDIS: Error while getting keys', err)
            this.LOGGER.log('REDIS: Deleting all keys to avoid issues')
            await this.REDIS.flushdb()
            return { total: 0, keys: [] }
        }
    }

    /**
     * /database/reset
     */
    @Wrapper(false)
    async deleteAll(): Promise<boolean> {
        const keys = await this.REDIS.keys('*')

        this.LOGGER.log(`REDIS: Deleting all ${keys.length} keys...`)
        await this.REDIS.flushdb()
        return true
    }

    /**
     * /database/delete/:key
     */
    @Wrapper(false)
    async deleteOne(key: string): Promise<boolean> {
        this.LOGGER.log('REDIS: Deleting single cache key...')
        await this.REDIS.del(key)
        return true
    }

    // #region non-endpoints
    /**
     * @param ttl - recommended TTLs:
     * - short: 1 hour - for data that the user may frequently update (wishlist, reviews, etc)
     * - medium: 6 hours - for more static data (group member data, etc)
     * - long: 1 day - for data that is not updated frequently (game translations, etc)
     * @default short
     */
    @Wrapper()
    async set(key: string, data: any, ttl: keyof typeof CACHE_TTL = 'short'): Promise<void> {
        this.LOGGER.log(`REDIS: set cache value with ${CACHE_TTL[ttl]}s TTL`)

        await this.REDIS.set(key, data, { ex: CACHE_TTL[ttl] })
    }

    @Wrapper()
    async get(key: string): Promise<any> {
        this.LOGGER.log('REDIS: get cache value')

        return await this.REDIS.get(key)
    }
}
