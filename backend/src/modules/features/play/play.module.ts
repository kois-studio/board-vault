import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'
import { GameTranslationModule } from '../../core/game-translation/game-translation.module.js'
import { GamesModule } from '../../core/games/games.module.js'
import { MeetAccountGamesModule } from '../../core/meet-account-games/meet-account-games.module.js'
import { MeetsModule } from '../../core/meets/meets.module.js'
import { UsersModule } from '../../core/users/users.module.js'

import { PlayController } from './play.controller.js'
import { PlayService } from './play.service.js'

@Module({
    imports: [DatabaseModule, UsersModule, GamesModule, MeetsModule, MeetAccountGamesModule, GameTranslationModule],
    providers: [PlayService],
    exports: [PlayService],
    controllers: [PlayController],
})
export class PlayModule {}
