import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { GameTitlesService } from './game-titles.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [GameTitlesService],
    exports: [GameTitlesService],
})
export class GameTitlesModule {}
