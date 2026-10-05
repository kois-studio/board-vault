import { Module } from '@nestjs/common'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard.js'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard.js'
import { AuthModule } from '../../common/auth/auth.module.js'
import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module.js'

import { GroupAcquisitionService } from './group-acquisition.service.js'
import { GroupInsightsService } from './group-insights.service.js'
import { GroupsController } from './groups.controller.js'
import { GroupsService } from './groups.service.js'
// module dependencies

@Module({
    imports: [AuthModule, CacheModule, DatabaseModule, GroupMembershipsModule],
    providers: [GroupsService, GroupAcquisitionService, GroupInsightsService, GroupOwnerGuard, UserInGroupGuard],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
