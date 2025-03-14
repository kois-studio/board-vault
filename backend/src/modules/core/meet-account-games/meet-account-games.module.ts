import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { MeetAccountGamesController } from './meet-account-games.controller'
import { MeetAccountGamesService } from './meet-account-games.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [MeetAccountGamesService],
    exports: [MeetAccountGamesService],
    controllers: [MeetAccountGamesController],
})
export class MeetAccountGamesModule {}
