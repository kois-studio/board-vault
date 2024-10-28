import { Module } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { GamePlaySessionController } from './game-play-session.controller'
import { GamePlaySessionService } from './game-play-session.service'

@Module({
    providers: [GamePlaySessionService, DatabaseService],
    exports: [GamePlaySessionService],
    controllers: [GamePlaySessionController],
})
export class GamePlaySessionModule {}
