import { forwardRef, Module } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { GroupsController } from './groups.controller'
// module dependencies
import { DatabaseModule } from '../common/database/database.module'
import { UsersModule } from '../users/users.module'
import { GamesOwnedModule } from '../core/games-owned/games-owned.module'
import { GamesModule } from '../core/games/games.module'
import { ReviewsModule } from '../core/reviews/reviews.module'

@Module({
    imports: [
        DatabaseModule,
        forwardRef(() => UsersModule),
        GamesOwnedModule,
        GamesModule,
        ReviewsModule,
    ],
    providers: [GroupsService],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
