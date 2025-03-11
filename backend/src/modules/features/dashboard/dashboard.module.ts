import { Module } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GroupsModule } from 'src/modules/groups/groups.module'
import { GroupMembershipsModule } from 'src/modules/core/group-memberships/group-memberships.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GroupsModule,
        GroupMembershipsModule
    ],
    providers: [DashboardService],
    exports: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
