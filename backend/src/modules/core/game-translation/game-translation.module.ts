import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { GameTranslationService } from './game-translation.service.js'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GameTranslationService],
    exports: [GameTranslationService],
})
export class GameTranslationModule {}
