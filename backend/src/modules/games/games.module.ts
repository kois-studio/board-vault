import { Module } from '@nestjs/common'
import { GamesService } from './games.service'
import { GamesController } from './games.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [GamesService, DatabaseService],
    exports: [GamesService],
    controllers: [GamesController],
})
export class GamesModule {}
