import { Module } from '@nestjs/common'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard.js'
import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module.js'
import { GroupsModule } from '../groups/groups.module.js'

import { InvitationsController } from './invitations.controller.js'
import { InvitationsService } from './invitations.service.js'
// module dependencies

@Module({
    imports: [CacheModule, DatabaseModule, GroupMembershipsModule, GroupsModule],
    providers: [InvitationsService, GroupOwnerGuard],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
