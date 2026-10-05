import { Module } from '@nestjs/common'

import { CacheModule } from '../cache/cache.module.js'
import { DatabaseModule } from '../database/database.module.js'

import { HealthController } from './health.controller.js'
import { HealthService } from './health.service.js'

@Module({
    imports: [CacheModule, DatabaseModule],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule {}
