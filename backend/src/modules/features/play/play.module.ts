import { Module } from '@nestjs/common'
import { PlayService } from './play.service'
import { PlayController } from './play.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GamesModule } from '../../core/games/games.module'
import { MeetsModule } from '../../meets/meets.module'
import { MeetAttendeesModule } from '../../core/meet-attendees/meet-attendees.module'
import { MeetAccountGamesModule } from '../../core/meet-account-games/meet-account-games.module'

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
