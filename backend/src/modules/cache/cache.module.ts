import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CacheService } from './cache.service'
import { CacheController } from './cache.controller'

@Module({
    providers: [CacheService, ConfigService],
    exports: [CacheService],
    controllers: [CacheController],
})
export class CacheModule {}
