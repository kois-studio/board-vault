import { Module } from '@nestjs/common'

import { ReviewsModule } from '../../../modules/core/reviews/reviews.module.js'
import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { GameProposalModule } from '../../core/game-proposal/game-proposal.module.js'
import { GameTranslationModule } from '../../core/game-translation/game-translation.module.js'
import { GamesModule } from '../../core/games/games.module.js'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module.js'
import { GroupMembershipsModule } from '../../core/group-memberships/group-memberships.module.js'
import { GroupsModule } from '../../core/groups/groups.module.js'
import { MeetAccountGamesModule } from '../../core/meet-account-games/meet-account-games.module.js'
import { MeetsModule } from '../../core/meets/meets.module.js'
import { UsersModule } from '../../core/users/users.module.js'

import { DashboardController } from './dashboard.controller.js'
import { DashboardService } from './dashboard.service.js'

@Module({
    imports: [
        DatabaseModule,
        CacheModule,
        UsersModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesOwnedModule,
        GamesModule,
        ReviewsModule,
        MeetsModule,
        MeetAccountGamesModule,
        GameTranslationModule,
        GameProposalModule,
    ],
    providers: [DashboardService],
    exports: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
