import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CacheController } from './cache.controller.js'
import { CacheService } from './cache.service.js'

@Module({
    providers: [CacheService, ConfigService],
    exports: [CacheService],
    controllers: [CacheController],
})
export class CacheModule {}
