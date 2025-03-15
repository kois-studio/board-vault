import { Module } from '@nestjs/common'

import { DatabaseModule } from '../common/database/database.module'
import { MeetAccountGamesModule } from '../core/meet-account-games/meet-account-games.module'

import { MeetsController } from './meets.controller'
import { MeetsService } from './meets.service'

@Module({
    imports: [DatabaseModule, MeetAccountGamesModule],
    providers: [MeetsService],
    exports: [MeetsService],
    controllers: [MeetsController],
})
export class MeetsModule {}
