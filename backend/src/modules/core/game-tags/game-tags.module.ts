import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { GameTagsService } from './game-tags.service.js'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GameTagsService],
    exports: [GameTagsService],
})
export class GameTagsModule {}
