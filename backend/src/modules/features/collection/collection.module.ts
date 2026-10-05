import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'
import { CollectionActivityModule } from '../../core/collection-activity/collection-activity.module.js'
import { GameTagsModule } from '../../core/game-tags/game-tags.module.js'
import { GameTranslationModule } from '../../core/game-translation/game-translation.module.js'
import { GamesModule } from '../../core/games/games.module.js'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module.js'
import { ReviewsModule } from '../../core/reviews/reviews.module.js'
import { TagCategoryModule } from '../../core/tag-category/tag-category.module.js'
import { TagsModule } from '../../core/tags/tags.module.js'
import { WishlistModule } from '../../core/wishlist/wishlist.module.js'

import { CollectionController } from './collection.controller.js'
import { CollectionService } from './collection.service.js'

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
