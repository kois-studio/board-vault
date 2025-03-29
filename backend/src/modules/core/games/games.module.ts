import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { GamesService } from './games.service'
// module dependencies

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GamesService],
    exports: [GamesService],
})
export class GamesModule {}
