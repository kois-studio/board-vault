import { Module } from '@nestjs/common'

import { ReviewsModule } from '../../../modules/core/reviews/reviews.module'
import { MeetsModule } from '../../../modules/meets/meets.module'
import { DatabaseModule } from '../../common/database/database.module'
import { GamesModule } from '../../core/games/games.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { GroupMembershipsModule } from '../../core/group-memberships/group-memberships.module'
import { GroupsModule } from '../../core/groups/groups.module'
import { UsersModule } from '../../core/users/users.module'

import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesOwnedModule,
        GamesModule,
        ReviewsModule,
        MeetsModule,
    ],
    providers: [DashboardService],
    exports: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
