import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'
import { GamesModule } from '../../core/games/games.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { GroupsModule } from '../../core/groups/groups.module'
import { MeetAccountGamesModule } from '../../core/meet-account-games/meet-account-games.module'
import { MeetAttendeesModule } from '../../core/meet-attendees/meet-attendees.module'
import { ReviewsModule } from '../../core/reviews/reviews.module'
import { TagsModule } from '../../core/tags/tags.module'
import { UsersModule } from '../../core/users/users.module'
import { WishlistModule } from '../../core/wishlist/wishlist.module'
import { MeetsModule } from '../../core/meets/meets.module'

import { CollectionController } from './collection.controller'
import { CollectionService } from './collection.service'

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
