import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GroupsModule } from '../../core/groups/groups.module'
import { GroupMembershipsModule } from '../../core/group-memberships/group-memberships.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { GamesModule } from '../../core/games/games.module'
import { ReviewsModule } from '../../../modules/core/reviews/reviews.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GroupsModule,
        GroupMembershipsModule,
        GamesOwnedModule,
        GamesModule,
        ReviewsModule,
    ],
    providers: [DashboardService],
    exports: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
