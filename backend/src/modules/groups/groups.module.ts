import { forwardRef, Module } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { GroupsController } from './groups.controller'
// module dependencies
import { DatabaseModule } from '../common/database/database.module'
import { UsersModule } from '../users/users.module'
import { GamesOwnedModule } from '../core/games-owned/games-owned.module'
import { GamesModule } from '../games/games.module'
import { GameReviewsModule } from '../reviews/reviews.module'

@Module({
    imports: [
        DatabaseModule,
        forwardRef(() => UsersModule),
        GamesOwnedModule,
        GamesModule,
        GameReviewsModule,
    ],
    providers: [GroupsService],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
