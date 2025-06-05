import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { GameTagsService } from './game-tags.service'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GameTagsService],
    exports: [GameTagsService],
})
export class GameTagsModule {}
