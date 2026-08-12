import { Module } from '@nestjs/common'

import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard'
import { DatabaseModule } from '../../common/database/database.module'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module'

import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'
// module dependencies

@Module({
    imports: [DatabaseModule, GroupMembershipsModule],
    providers: [InvitationsService, UserInGroupGuard],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
