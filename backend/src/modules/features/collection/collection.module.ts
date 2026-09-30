import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'
import { CollectionActivityModule } from '../../core/collection-activity/collection-activity.module'
import { GameTagsModule } from '../../core/game-tags/game-tags.module'
import { GameTranslationModule } from '../../core/game-translation/game-translation.module'
import { GamesModule } from '../../core/games/games.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { ReviewsModule } from '../../core/reviews/reviews.module'
import { TagCategoryModule } from '../../core/tag-category/tag-category.module'
import { TagsModule } from '../../core/tags/tags.module'
import { WishlistModule } from '../../core/wishlist/wishlist.module'

import { CollectionController } from './collection.controller'
import { CollectionService } from './collection.service'

@Module({
    imports: [
        DatabaseModule,
        GamesModule,
        TagsModule,
        ReviewsModule,
        WishlistModule,
        GameTagsModule,
        GamesOwnedModule,
        TagCategoryModule,
        GameTranslationModule,
        CollectionActivityModule,
    ],
    providers: [CollectionService],
    exports: [CollectionService],
    controllers: [CollectionController],
})
export class CollectionModule {}
