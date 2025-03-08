import { Module } from '@nestjs/common'
import { GamesOwnedService } from './games-owned.service'
import { GamesOwnedController } from './games-owned.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [GamesOwnedService],
    exports: [GamesOwnedService],
    controllers: [GamesOwnedController],
})
export class GamesOwnedModule {}
