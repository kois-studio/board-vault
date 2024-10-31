import { Module } from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
import { DatabaseService } from '../database/database.service'
import { GroupsService } from '../groups/groups.service'
import { GroupMembershipsService } from '../group-memberships/group-memberships.service'
import { UsersService } from '../users/users.service'
import { NotificationsService } from '../notifications/notifications.service'
import { MeetsService } from '../meets/meets.service'

@Module({
    providers: [
        InvitationsService,
        DatabaseService,
        GroupsService,
        GroupMembershipsService,
        UsersService,
        NotificationsService,
        MeetsService,
    ],
    exports: [InvitationsService],
    controllers: [InvitationsController],
})
export class InvitationsModule {}
