import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { GameTranslationService } from './game-translation.service'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GameTranslationService],
    exports: [GameTranslationService],
})
export class GameTranslationModule {}
