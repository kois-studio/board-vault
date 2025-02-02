import { Module } from '@nestjs/common'
import { GamePlaySessionController } from './game-play-session.controller'
import { GamePlaySessionService } from './game-play-session.service'
// module dependencies
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [GamePlaySessionService],
    exports: [GamePlaySessionService],
    controllers: [GamePlaySessionController],
})
export class GamePlaySessionModule {}
