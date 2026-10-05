import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { MeetAccountGamesController } from './meet-account-games.controller.js'
import { MeetAccountGamesService } from './meet-account-games.service.js'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [MeetAccountGamesService],
    exports: [MeetAccountGamesService],
    controllers: [MeetAccountGamesController],
})
export class MeetAccountGamesModule {}
