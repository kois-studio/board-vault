import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GroupsModule } from 'src/modules/groups/groups.module'
import { GroupMembershipsModule } from 'src/modules/core/group-memberships/group-memberships.module'
import { GamesOwnedModule } from 'src/modules/core/games-owned/games-owned.module'
import { GamesModule } from 'src/modules/core/games/games.module'
import { ReviewsModule } from 'src/modules/core/reviews/reviews.module'

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
