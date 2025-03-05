import { Module } from '@nestjs/common'
import { MeetAccountGamesService } from './meet-account-games.service'
import { MeetAccountGamesController } from './meet-account-games.controller'
// module dependencies
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [MeetAccountGamesService],
    exports: [MeetAccountGamesService],
    controllers: [MeetAccountGamesController],
})
export class MeetAccountGamesModule {}
