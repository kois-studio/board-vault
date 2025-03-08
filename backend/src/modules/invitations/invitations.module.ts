import { Module } from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
// module dependencies
import { DatabaseModule } from '../common/database/database.module'
import { GroupsModule } from '../groups/groups.module'
import { GroupMembershipsModule } from '../core/group-memberships/group-memberships.module'
import { UsersModule } from '../users/users.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MeetsModule } from '../meets/meets.module'

@Module({
    imports: [DatabaseModule, GroupsModule, GroupMembershipsModule, UsersModule, NotificationsModule, MeetsModule],
    providers: [InvitationsService],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
