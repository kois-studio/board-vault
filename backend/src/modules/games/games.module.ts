import { Module } from '@nestjs/common'
import { GamesService } from './games.service'
import { GamesController } from './games.controller'
// module dependencies
import { DatabaseModule } from '../database/database.module'
import { CacheModule } from '../cache/cache.module'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GamesService],
    exports: [GamesService],
    controllers: [GamesController],
})
export class GamesModule {}
