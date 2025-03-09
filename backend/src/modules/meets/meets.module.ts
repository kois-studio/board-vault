import { Module } from '@nestjs/common'
import { MeetsService } from './meets.service'
import { MeetsController } from './meets.controller'
// module dependencies
import { DatabaseModule } from '../common/database/database.module'
import { MeetAccountGamesModule } from '../core/meet-account-games/meet-account-games.module'

@Module({
    imports: [DatabaseModule, MeetAccountGamesModule],
    providers: [MeetsService],
    exports: [MeetsService],
    controllers: [MeetsController],
})
export class MeetsModule {}
