import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'
import { GameProposalModule } from '../../core/game-proposal/game-proposal.module'
import { GameTagsModule } from '../../core/game-tags/game-tags.module'
import { GameTranslationModule } from '../../core/game-translation/game-translation.module'
import { GamesModule } from '../../core/games/games.module'
import { NotificationsModule } from '../../core/notifications/notifications.module'
import { TagCategoryModule } from '../../core/tag-category/tag-category.module'
import { TagsModule } from '../../core/tags/tags.module'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        CacheModule,
        GamesModule,
        TagsModule,
        GameTagsModule,
        TagCategoryModule,
        GameTranslationModule,
        GameProposalModule,
        NotificationsModule,
    ],
    providers: [AdminService],
    exports: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}
