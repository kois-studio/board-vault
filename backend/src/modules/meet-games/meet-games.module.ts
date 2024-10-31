import { Module } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { MeetGamesService } from './meet-games.service'
import { MeetGamesController } from './meet-games.controller'

@Module({
    providers: [MeetGamesService, DatabaseService],
    exports: [MeetGamesService],
    controllers: [MeetGamesController],
})
export class MeetGamesModule {}
