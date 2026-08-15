import { createHash } from 'node:crypto'

import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { CacheService } from '../../modules/common/cache/cache.service'

export const RATE_LIMIT_METADATA = 'board-vault:rate-limit'

export type RateLimitOptions = {
    limit: number
    windowSeconds: number
}

export const RateLimit = (limit: number, windowSeconds: number) => SetMetadata(RATE_LIMIT_METADATA, { limit, windowSeconds })

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_METADATA, [context.getHandler(), context.getClass()])

        if (!options) {
            return true
        }

        const request = context.switchToHttp().getRequest<{
            ip?: string
            path?: string
            route?: { path?: string }
            socket?: { remoteAddress?: string }
        }>()
        const clientAddress = request.ip ?? request.socket?.remoteAddress ?? 'unknown'
        const endpoint = request.route?.path ?? request.path ?? 'unknown'
        const bucket = Math.floor(Date.now() / 1000 / options.windowSeconds)
        const identifier = createHash('sha256').update(`${endpoint}:${clientAddress}:${bucket}`).digest('hex')
        const count = await this.cacheService.increment(`rate-limit:${identifier}`, options.windowSeconds)

        // Redis is intentionally optional for local development. Production must
        // keep it enabled or this guard will fail open.
        if (count !== null && count > options.limit) {
            throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS)
        }

        return true
    }
}
