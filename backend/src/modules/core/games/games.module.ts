import { Module } from '@nestjs/common'
import { GamesService } from './games.service'
import { GamesController } from './games.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { CacheModule } from '../../common/cache/cache.module'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GamesService],
    exports: [GamesService],
    controllers: [GamesController],
})
export class GamesModule {}
