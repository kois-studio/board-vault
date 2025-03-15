import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'
import { GamesModule } from '../../core/games/games.module'
import { MeetAccountGamesModule } from '../../core/meet-account-games/meet-account-games.module'
import { MeetAttendeesModule } from '../../core/meet-attendees/meet-attendees.module'
import { UsersModule } from '../../core/users/users.module'
import { MeetsModule } from '../../core/meets/meets.module'

import { PlayController } from './play.controller'
import { PlayService } from './play.service'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GamesModule,
        MeetsModule,
        MeetAttendeesModule,
        MeetAccountGamesModule,
    ],
    providers: [PlayService],
    exports: [PlayService],
    controllers: [PlayController],
})
export class PlayModule {}
