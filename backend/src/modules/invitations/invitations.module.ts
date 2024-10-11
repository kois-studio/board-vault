import { Module } from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
import { DatabaseService } from '../database/database.service'
import { GroupsService } from '../groups/groups.service'
import { GroupMembershipsService } from '../group-memberships/group-memberships.service'
import { UsersService } from '../users/users.service'
import { NotificationsService } from '../notifications/notifications.service'

@Module({
    providers: [InvitationsService, DatabaseService, GroupsService, GroupMembershipsService, UsersService, NotificationsService],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
