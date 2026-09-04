import { Module } from '@nestjs/common'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard'
import { AuthModule } from '../../common/auth/auth.module'
import { DatabaseModule } from '../../common/database/database.module'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module'

import { GroupAcquisitionService } from './group-acquisition.service'
import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'
// module dependencies

@Module({
    imports: [AuthModule, DatabaseModule, GroupMembershipsModule],
    providers: [GroupsService, GroupAcquisitionService, GroupOwnerGuard, UserInGroupGuard],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
