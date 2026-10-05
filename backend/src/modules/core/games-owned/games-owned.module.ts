import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { GamesOwnedService } from './games-owned.service.js'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [GamesOwnedService],
    exports: [GamesOwnedService],
})
export class GamesOwnedModule {}
