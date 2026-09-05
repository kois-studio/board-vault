import { Module } from '@nestjs/common'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard'
import { DatabaseModule } from '../../common/database/database.module'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module'
import { GroupsModule } from '../groups/groups.module'

import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'
// module dependencies

@Module({
    imports: [DatabaseModule, GroupMembershipsModule, GroupsModule],
    providers: [InvitationsService, GroupOwnerGuard],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
