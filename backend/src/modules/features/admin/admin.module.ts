import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'
import { TagCategoryModule } from '../../core/tag-category/tag-category.module'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { GamesModule } from 'src/modules/core/games/games.module'
import { TagsModule } from 'src/modules/core/tags/tags.module'
import { GameTagsModule } from 'src/modules/core/game-tags/game-tags.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        GamesModule,
        TagsModule,
        GameTagsModule,
        TagCategoryModule,
    ],
    providers: [AdminService],
    exports: [AdminService],
    controllers: [AdminController],
})
export class AdminModule {}
