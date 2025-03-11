import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
// module dependencies
import { MeetsModule } from '../meets/meets.module'
import { DatabaseModule } from '../common/database/database.module'
import { GroupsModule } from '../core/groups/groups.module'
import { GroupMembershipsModule } from '../core/group-memberships/group-memberships.module'
import { GamesModule } from '../core/games/games.module'
import { GamesOwnedModule } from '../core/games-owned/games-owned.module'
import { TagsModule } from '../core/tags/tags.module'
import { ReviewsModule } from '../core/reviews/reviews.module'
import { WishlistModule } from '../core/wishlist/wishlist.module'

@Module({
    imports: [
        MeetsModule,
        DatabaseModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesModule,
        GamesOwnedModule,
        TagsModule,
        ReviewsModule,
        WishlistModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
