import { forwardRef, Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
// module dependencies
import { MeetsModule } from '../meets/meets.module'
import { DatabaseModule } from '../common/database/database.module'
import { GroupsModule } from '../groups/groups.module'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module'
import { GamesModule } from '../games/games.module'
import { GamesOwnedModule } from '../core/games-owned/games-owned.module'
import { TagsModule } from '../core/tags/tags.module'
import { GameReviewsModule } from '../reviews/reviews.module'
import { WishlistModule } from '../core/wishlist/wishlist.module'

@Module({
    imports: [
        MeetsModule,
        DatabaseModule,
        forwardRef(() => GroupsModule),
        GroupMembershipsModule,
        GamesModule,
        GamesOwnedModule,
        TagsModule,
        GameReviewsModule,
        WishlistModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
