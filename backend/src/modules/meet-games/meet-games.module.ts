import { Module } from '@nestjs/common'
import { MeetGamesService } from './meet-games.service'
import { MeetGamesController } from './meet-games.controller'
// module dependencies
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [MeetGamesService],
    exports: [MeetGamesService],
    controllers: [MeetGamesController],
})
export class MeetGamesModule {}
