import { Module } from '@nestjs/common'

import { ReviewsModule } from '../../../modules/core/reviews/reviews.module'
import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'
import { GameProposalModule } from '../../core/game-proposal/game-proposal.module'
import { GameTranslationModule } from '../../core/game-translation/game-translation.module'
import { GamesModule } from '../../core/games/games.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { GroupMembershipsModule } from '../../core/group-memberships/group-memberships.module'
import { GroupsModule } from '../../core/groups/groups.module'
import { MeetAccountGamesModule } from '../../core/meet-account-games/meet-account-games.module'
import { MeetsModule } from '../../core/meets/meets.module'
import { UsersModule } from '../../core/users/users.module'

import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

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
