import { Module } from '@nestjs/common'
import { GamesOwnedService } from './games-owned.service'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [GamesOwnedService],
    exports: [GamesOwnedService],
})
export class GamesOwnedModule {}
