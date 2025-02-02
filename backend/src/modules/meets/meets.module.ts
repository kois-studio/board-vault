import { Module } from '@nestjs/common'
import { MeetsService } from './meets.service'
import { MeetsController } from './meets.controller'
// module dependencies
import { GamePlaySessionModule } from '../game-play-session/game-play-session.module'
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule, GamePlaySessionModule],
    providers: [MeetsService],
    exports: [MeetsService],
    controllers: [MeetsController],
})
export class MeetsModule {}
