import { Module } from '@nestjs/common'
import { GamesOwnedService } from './games-owned.service'
import { GamesOwnedController } from './games-owned.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [GamesOwnedService, DatabaseService],
    exports: [GamesOwnedService],
    controllers: [GamesOwnedController],
})
export class GamesOwnedModule {}
