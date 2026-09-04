import { Injectable } from '@nestjs/common'

import { CacheService } from '../cache/cache.service'
import { DatabaseService } from '../database/database.service'

import type { LivenessDto, ReadinessDto, ReadinessChecksDto } from '../../../common/types/health.type'

@Injectable()
export class HealthService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    getLiveness(): LivenessDto {
        return { status: 'ok' }
    }

    async getReadiness(): Promise<ReadinessDto> {
        const [database, cache] = await Promise.all([
            this.databaseService
                .checkHealth()
                .then(() => 'up' as const)
                .catch(() => 'down' as const),
            this.cacheService.checkHealth(),
        ])
        const checks: ReadinessChecksDto = { database, cache }

        return {
            status: database === 'up' && cache !== 'down' ? 'ready' : 'not_ready',
            checks,
        }
    }
}
