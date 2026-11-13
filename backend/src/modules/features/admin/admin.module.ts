import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { ArtworkModule } from '../../core/artwork/artwork.module.js'
import { GameProposalModule } from '../../core/game-proposal/game-proposal.module.js'
import { GameTagsModule } from '../../core/game-tags/game-tags.module.js'
import { GameTitlesModule } from '../../core/game-titles/game-titles.module.js'
import { GamesModule } from '../../core/games/games.module.js'
import { NotificationsModule } from '../../core/notifications/notifications.module.js'
import { TagCategoryModule } from '../../core/tag-category/tag-category.module.js'
import { TagsModule } from '../../core/tags/tags.module.js'

import { AdminController } from './admin.controller.js'
import { AdminService } from './admin.service.js'

@Module({
    imports: [
        DatabaseModule,
        CacheModule,
        ArtworkModule,
        GamesModule,
        TagsModule,
        GameTagsModule,
        TagCategoryModule,
        GameTitlesModule,
        GameProposalModule,
        NotificationsModule,
    ],
    providers: [AdminService],
    exports: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}
