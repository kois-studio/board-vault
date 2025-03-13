import { Module } from '@nestjs/common'
import { CollectionService } from './collection.service'
import { CollectionController } from './collection.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GamesModule } from '../../core/games/games.module'
import { TagsModule } from '../../core/tags/tags.module'
import { MeetsModule } from 'src/modules/meets/meets.module'
import { GroupsModule } from 'src/modules/core/groups/groups.module'
import { ReviewsModule } from '../../core/reviews/reviews.module'
import { WishlistModule } from '../../core/wishlist/wishlist.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { MeetAttendeesModule } from 'src/modules/core/meet-attendees/meet-attendees.module'
import { MeetAccountGamesModule } from 'src/modules/core/meet-account-games/meet-account-games.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GamesModule,
        TagsModule,
        MeetsModule,
        GroupsModule,
        ReviewsModule,
        WishlistModule,
        GamesOwnedModule,
        MeetAttendeesModule,
        MeetAccountGamesModule,
    ],
    providers: [CollectionService],
    exports: [CollectionService],
    controllers: [CollectionController],
})
export class CollectionModule {}
