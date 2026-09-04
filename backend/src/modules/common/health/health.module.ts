import { Module } from '@nestjs/common'

import { CacheModule } from '../cache/cache.module'
import { DatabaseModule } from '../database/database.module'

import { HealthController } from './health.controller'
import { HealthService } from './health.service'

@Module({
    imports: [CacheModule, DatabaseModule],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule {}
