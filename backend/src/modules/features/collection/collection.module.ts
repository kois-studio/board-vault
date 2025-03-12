import { Module } from '@nestjs/common'
import { CollectionService } from './collection.service'
import { CollectionController } from './collection.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GamesModule } from '../../core/games/games.module'
import { TagsModule } from '../../core/tags/tags.module'
import { ReviewsModule } from '../../core/reviews/reviews.module'
import { WishlistModule } from '../../core/wishlist/wishlist.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GamesModule,
        TagsModule,
        ReviewsModule,
        WishlistModule,
        GamesOwnedModule,
    ],
    providers: [CollectionService],
    exports: [CollectionService],
    controllers: [CollectionController],
})
export class CollectionModule {}
