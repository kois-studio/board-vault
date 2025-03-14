import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { GamesOwnedService } from './games-owned.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [GamesOwnedService],
    exports: [GamesOwnedService],
})
export class GamesOwnedModule {}
